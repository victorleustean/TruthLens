"use client";

import React from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Flex,
  Text,
  Icon,
  VStack,
  HStack,
  Badge,
  Link,
} from "@chakra-ui/react";
import {
  HiOutlineHome,
  HiOutlinePhotograph,
  HiOutlineMusicNote,
} from "react-icons/hi";
import { FiBarChart2, FiFilm, FiMic } from "react-icons/fi";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", icon: HiOutlineHome, href: "/" },
    { label: "Writing", icon: FiBarChart2, href: "/writing" },
  ];

  const mediaItems = [
    { label: "Movies", icon: FiFilm, href: "/movies" },
    { label: "Pictures", icon: HiOutlinePhotograph, href: "/pictures" },
    { label: "Music", icon: HiOutlineMusicNote, href: "/music" },
    { label: "Podcasts", icon: FiMic, href: "/podcasts" },
  ];

  return (
    <Box
      w="100%"
      h="100%"
      bg="white"
      px={{ base: 4, md: 4, lg: 5 }}
      py={6}
      borderRight="1px solid"
      borderColor="gray.100"
    >
      <Flex align="center" mb={8} gap={2}>
        <Flex
          align="center"
          justify="center"
          boxSize="34px"
          borderRadius="full"
          border="2px solid"
          borderColor="blue.500"
          color="blue.500"
          fontWeight="bold"
          fontSize="lg"
          flexShrink={0}
        >
          ↯
        </Flex>

        <HStack gap={2}>
          <Text
            fontSize={{ base: "2xl", md: "2xl", lg: "3xl" }}
            fontWeight="bold"
            color="blue.500"
            lineHeight="1"
          >
            chakra
          </Text>
          <Badge
            colorScheme="blue"
            fontSize="0.7em"
            px={2}
            py={1}
            borderRadius="md"
          >
            PRO
          </Badge>
        </HStack>
      </Flex>

      <VStack align="stretch" gap={2}>
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              as={NextLink}
              href={item.href}
              key={item.label}
              _hover={{ textDecoration: "none" }}
            >
              <HStack
                gap={3}
                px={4}
                py={3}
                borderRadius="12px"
                cursor="pointer"
                bg={active ? "blue.50" : "transparent"}
                color={active ? "gray.800" : "gray.600"}
                _hover={{
                  bg: "gray.50",
                  color: "gray.800",
                }}
                transition="all 0.2s ease"
              >
                <Icon as={item.icon} boxSize={5} />
                <Text
                  fontSize={{ md: "sm", lg: "md" }}
                  fontWeight={active ? "medium" : "normal"}
                >
                  {item.label}
                </Text>
              </HStack>
            </Link>
          );
        })}

        <Text
          fontSize="sm"
          color="gray.400"
          fontWeight="medium"
          mt={6}
          mb={2}
          px={1}
        >
          Media
        </Text>

        {mediaItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              as={NextLink}
              href={item.href}
              key={item.label}
              _hover={{ textDecoration: "none" }}
            >
              <HStack
                gap={3}
                px={4}
                py={3}
                borderRadius="12px"
                cursor="pointer"
                bg={active ? "blue.50" : "transparent"}
                color={active ? "gray.800" : "gray.600"}
                _hover={{
                  bg: "gray.50",
                  color: "gray.800",
                }}
                transition="all 0.2s ease"
              >
                <Icon as={item.icon} boxSize={5} />
                <Text
                  fontSize={{ md: "sm", lg: "md" }}
                  fontWeight={active ? "medium" : "normal"}
                >
                  {item.label}
                </Text>
              </HStack>
            </Link>
          );
        })}
      </VStack>
    </Box>
  );
}