import {Container, Heading, VStack, Text, Box} from "@chakra-ui/react"
import { VideoUpload } from "@/components/VideoUpload"
import {JobsList} from "@/components/JobsList"

  export default function Home() {
    return(
      <Container maxW="container.md" py={20}>
        <VStack spacing={8} textAlign="center">
          <Box>
            <Heading size="2xl" mb={2}>TruthLens</Heading>
            <Text color="gray.600">Verifică în câteva secunde dacă un video este real sau generat de AI</Text>
          </Box>
          <VideoUpload/>
          <JobsList/>
        </VStack>
      </Container>
    )
  }
