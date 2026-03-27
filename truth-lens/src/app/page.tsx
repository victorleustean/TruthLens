"use client";

import React, { useState } from "react";
import {
  Container,
  Heading,
  VStack,
  Text,
  Box,
  Flex,
  IconButton,
} from "@chakra-ui/react";
import { FiMenu, FiX } from "react-icons/fi";
import { JobsList } from "@/components/JobsList";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <Flex minH="100vh" bg="gray.50" position="relative">
      <Box
        display={{ base: "none", md: "block" }}
        w={{ md: "220px", lg: "315px" }}
        position="sticky"
        top="0"
        alignSelf="flex-start"
        h="100vh"
        flexShrink={0}
        bg="white"
      >
        <Sidebar />
      </Box>

      {mobileMenuOpen && (
        <>
          <Box
            display={{ base: "block", md: "none" }}
            position="fixed"
            inset={0}
            bg="blackAlpha.600"
            zIndex={39}
            onClick={() => setMobileMenuOpen(false)}
          />
          <Box
            display={{ base: "block", md: "none" }}
            position="fixed"
            top={0}
            left={0}
            w="260px"
            h="100vh"
            bg="white"
            zIndex={40}
            boxShadow="lg"
          >
            <Sidebar />
          </Box>
        </>
      )}

      <Box flex="1" minW={0}>
        <Flex
          display={{ base: "flex", md: "none" }}
          align="center"
          justify="space-between"
          px={4}
          py={4}
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.200"
          position="sticky"
          top="0"
          zIndex={30}
        >
          <Text fontSize="lg" fontWeight="bold" color="blue.500">
            TruthLens
          </Text>

          <IconButton
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            variant="ghost"
          >
            {mobileMenuOpen ? <FiX /> : <FiMenu />}
          </IconButton>
        </Flex>

        <Box p={{ base: 6, md: 8, lg: 10 }}>
          <Container maxW="container.md">
            <VStack gap={8} textAlign="center">
              <Box>
                <Heading size="2xl" mb={2}>
                  TruthLens
                </Heading>
                <Text color="gray.600">
                  Verifică în câteva secunde dacă un video este real sau generat
                  de AI
                </Text>
              </Box>

              <AnalysisTabs />
              <JobsList />
            </VStack>
          </Container>
        </Box>
      </Box>
    </Flex>
  );
}