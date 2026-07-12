package com.fridge.web;

import com.fridge.dto.MemeDto;
import com.fridge.dto.YoutubeRecommendationDto;
import com.fridge.service.MemeService;
import com.fridge.service.YouTubeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/memes")
@RequiredArgsConstructor
public class MemeController {

    private final MemeService memeService;
    private final YouTubeService youTubeService;

    @GetMapping(value = "/trending", produces = "application/json;charset=UTF-8")
    public ResponseEntity<List<MemeDto>> trending() {
        return ResponseEntity.ok(memeService.getTrendingMemes());
    }

    @GetMapping(value = "/{term}/videos", produces = "application/json;charset=UTF-8")
    public ResponseEntity<List<YoutubeRecommendationDto>> videos(@PathVariable String term) {
        YouTubeService.YouTubeSearchResult result = youTubeService.searchVideosForQuery(term, 10);
        List<YoutubeRecommendationDto> videos = result.getVideos().stream()
                .map(v -> YoutubeRecommendationDto.builder().videoId(v.getVideoId()).title(v.getTitle()).build())
                .toList();
        return ResponseEntity.ok(videos);
    }
}
