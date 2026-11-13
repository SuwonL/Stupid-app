package com.fridge.service;

import com.fridge.dto.StockMoverScanDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class StockMoverScanTest {
    private StockMarketService service;
    private MockRestServiceServer server;
    private static final String ROW = """
            {"stck_shrn_iscd":"005930","hts_kor_isnm":"삼성전자",
             "stck_prpr":"70,000","prdy_ctrt":"3.25","acml_vol":"1,234"}
            """;

    @BeforeEach
    void setup() {
        RestTemplate rest = new RestTemplate();
        service = new StockMarketService(rest);
        server = MockRestServiceServer.bindTo(rest).build();
        ReflectionTestUtils.setField(service, "kisBaseUrl", "https://kis.test");
        ReflectionTestUtils.setField(service, "kisAppKey", "test-key");
        ReflectionTestUtils.setField(service, "kisAppSecret", "test-secret");
        ReflectionTestUtils.setField(service, "kisAccessToken", "test-token");
        ReflectionTestUtils.setField(service, "kisTokenExpiresAtMs", Long.MAX_VALUE);
    }

    private void expectMarket(String code, String body) {
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/ranking/fluctuation?")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(queryParam("FID_INPUT_ISCD", code))
                .andExpect(queryParam("FID_COND_SCR_DIV_CODE", "20170"))
                .andExpect(header("tr_id", "FHPST01700000"))
                .andExpect(header("Authorization", "Bearer test-token"))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    @Test
    void scansBothBoardsAndMapsDocumentedFields() {
        expectMarket("0001", "{\"rt_cd\":\"0\",\"output\":[" + ROW + "]}");
        expectMarket("1001", "{\"rt_cd\":\"0\",\"output\":[]}");
        StockMoverScanDto scan = service.scanMovers("domestic", 30);
        assertThat(scan.movers()).hasSize(1);
        var mover = scan.movers().get(0);
        assertThat(mover.getSymbol()).isEqualTo("005930");
        assertThat(mover.getName()).isEqualTo("삼성전자");
        assertThat(mover.getPrice()).isEqualTo(70000d);
        assertThat(mover.getChangePercent()).isEqualTo(3.25d);
        assertThat(mover.getVolume()).isEqualTo(1234L);
        assertThat(scan.markets()).extracting(StockMoverScanDto.MarketStatus::status)
                .containsExactly("success", "empty");
        assertThat(scan.checkedAt()).isNotNull();
        server.verify();
    }

    @Test
    void providerRejectionDoesNotDiscardOtherBoard() {
        expectMarket("0001", "{\"rt_cd\":\"1\",\"msg1\":\"sensitive provider detail\"}");
        expectMarket("1001", "{\"rt_cd\":\"0\",\"output\":[" + ROW + "]}");
        var scan = service.scanMovers("domestic", 30);
        assertThat(scan.movers()).hasSize(1);
        assertThat(scan.markets().get(0).code()).isEqualTo("PROVIDER_REJECTED");
        assertThat(scan.toString()).doesNotContain("sensitive provider detail", "test-secret", "test-token");
        server.verify();
    }

    @Test
    void missingOutputAndAllInvalidRowsAreErrorsNotEmpty() {
        expectMarket("0001", "{\"rt_cd\":\"0\"}");
        expectMarket("1001", "{\"rt_cd\":\"0\",\"output\":[{\"unknown_field\":\"123\"}]}");
        var scan = service.scanMovers("domestic", 30);
        assertThat(scan.movers()).isEmpty();
        assertThat(scan.markets()).extracting(StockMoverScanDto.MarketStatus::status)
                .containsExactly("error", "error");
        assertThat(scan.markets()).extracting(StockMoverScanDto.MarketStatus::code)
                .containsExactly("INVALID_RESPONSE", "INVALID_ROWS");
        server.verify();
    }

    @Test
    void keepsValidRowsAndReportsPartialParsing() {
        expectMarket("0001", "{\"rt_cd\":\"0\",\"output\":[{}," + ROW + ","
                + ROW.replace("70,000", "NaN") + "]}");
        expectMarket("1001", "{\"rt_cd\":\"0\",\"output\":[]}");
        var scan = service.scanMovers("domestic", 1);
        assertThat(scan.movers()).hasSize(1);
        assertThat(scan.markets().get(0).status()).isEqualTo("partial");
        assertThat(scan.markets().get(0).rejectedCount()).isEqualTo(2);
        server.verify();
    }

    @Test
    void httpErrorIsVisibleWhileOtherMarketStillRuns() {
        server.expect(requestTo(org.hamcrest.Matchers.containsString("FID_INPUT_ISCD=0001")))
                .andRespond(withUnauthorizedRequest());
        expectMarket("1001", "{\"rt_cd\":\"0\",\"output\":[]}");
        var scan = service.scanMovers("domestic", 30);
        assertThat(scan.markets().get(0).code()).isEqualTo("HTTP_401");
        assertThat(scan.markets().get(1).status()).isEqualTo("empty");
        server.verify();
    }

    @Test
    void tokenFailureDoesNotBecomeEmptySuccess() {
        ReflectionTestUtils.setField(service, "kisAccessToken", null);
        for (int i = 0; i < 2; i++) {
            server.expect(requestTo("https://kis.test/oauth2/tokenP"))
                    .andExpect(method(HttpMethod.POST))
                    .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        }
        var scan = service.scanMovers("domestic", 30);
        assertThat(scan.markets()).allMatch(m -> m.status().equals("error"));
        server.verify();
    }

    @Test
    void missingCredentialsAreNotAProviderSuccess() {
        ReflectionTestUtils.setField(service, "kisAppKey", "");
        var scan = service.scanMovers("all", 30);
        assertThat(scan.movers()).isEmpty();
        assertThat(scan.markets()).hasSize(3).allMatch(m -> m.status().equals("not_configured"));
        server.verify();
    }

    @Test
    void overseasScanDoesNotCallKisAndReportsItsOwnStatus() {
        ReflectionTestUtils.setField(service, "polygonApiKey", "test-polygon");
        server.expect(requestTo("https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=test-polygon"))
                .andRespond(withSuccess("""
                        {"tickers":[{"ticker":"ABC","day":{"c":10,"v":123},"todaysChangePerc":5.5}]}
                        """, MediaType.APPLICATION_JSON));
        var scan = service.scanMovers("overseas", 30);
        assertThat(scan.markets()).hasSize(1);
        assertThat(scan.markets().get(0).market()).isEqualTo("US");
        assertThat(scan.markets().get(0).status()).isEqualTo("success");
        assertThat(scan.movers().get(0).getSymbol()).isEqualTo("ABC");
        server.verify();
    }

    @Test
    void overseasMalformedResponseIsNotAnEmptySuccess() {
        ReflectionTestUtils.setField(service, "polygonApiKey", "test-polygon");
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/gainers?")))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        var scan = service.scanMovers("overseas", 30);
        assertThat(scan.markets().get(0).status()).isEqualTo("error");
        assertThat(scan.markets().get(0).code()).isEqualTo("INVALID_RESPONSE");
        server.verify();
    }

    @Test
    void legacyListAndRegionValidationRemainAvailable() {
        ReflectionTestUtils.setField(service, "kisAppKey", "");
        assertThat(service.getMovers("domestic", 30)).isEmpty();
        assertThatThrownBy(() -> service.scanMovers("invalid", 30))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
