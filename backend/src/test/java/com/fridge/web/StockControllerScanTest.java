package com.fridge.web;

import com.fridge.service.StockMarketService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class StockControllerScanTest {
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new StockController(new StockMarketService(new RestTemplate()))).build();

    @Test
    void serializesMarketDiagnosticsAndTimestamp() throws Exception {
        mvc.perform(get("/api/stocks/movers/scan").param("region", "domestic"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.movers").isArray())
                .andExpect(jsonPath("$.markets.length()").value(2))
                .andExpect(jsonPath("$.markets[0].market").value("KOSPI"))
                .andExpect(jsonPath("$.markets[0].status").value("not_configured"))
                .andExpect(jsonPath("$.checkedAt").exists());
    }

    @Test
    void preservesLegacyArrayResponse() throws Exception {
        mvc.perform(get("/api/stocks/movers").param("region", "domestic"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void rejectsUnknownRegion() throws Exception {
        mvc.perform(get("/api/stocks/movers/scan").param("region", "other"))
                .andExpect(status().isBadRequest());
    }
}
