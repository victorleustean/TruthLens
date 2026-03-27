"use client";

import { Box, Tabs } from "@chakra-ui/react";
import { VideoUpload } from "@/components/VideoUpload";
import { JobsList } from "@/components/JobsList";
import { ArticleAnalyzer } from "@/components/ArticleAnalyzer";

export const AnalysisTabs = () => {
  return (
    <Box w="full">
      <Tabs.Root defaultValue="video" variant="enclosed" fitted>
        <Tabs.List>
          <Tabs.Trigger value="video">Video</Tabs.Trigger>
          <Tabs.Trigger value="article">Articol / Text</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="video" pt={4}>
          <VideoUpload />
          <Box mt={8}>
            <JobsList />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="article" pt={4}>
          <ArticleAnalyzer />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};