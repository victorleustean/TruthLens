import {useState} from "react";
import {
  Box,
  VStack,
  Button,
  Text,
  Spinner,
  Badge,
  Textarea,
  HStack,
} from "@chakra-ui/react";


type ClaimVerdict="TRUE"|"FALSE"|"UNVERIFIABLE";


interface Claim {
  claim: string;
  verdict: ClaimVerdict;
  reasoning: string;
}


interface AnalysisResult {
  text: string;
  location?: {
    country_code: string;
    country_name: string;
  };
  fusion: {
    final_score:number;
    risk_level:string;
    verdict:string;
  };
  claims: Claim[];
}


const VERDICT_ICON: Record<ClaimVerdict, string> = {
  TRUE: "✅",
  FALSE: "❌",
  UNVERIFIABLE: "⚠️",
}


const RISK_LEVEL_COLOR: Record<string, string> = {
  Critical: "red",
  High: "orange",
  Medium: "yellow",
  Low: "green",
}


export const ArticleAnalyzer = () => {
  const [text, setText]= useState("");
  const [isLoading,setIsLoading]=useState(false);
  const [result, setResult]=useState<AnalysisResult | null>(null);
  const [error,setError]=useState<string | null>(null);


  const handleAnalyze = async() => {
    const trimmedText=text.trim();
    if(!trimmedText) return;


    setIsLoading(true);
    setResult(null);
    setError(null);


    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/fakenews/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: trimmedText,
          })
        }
      );


      if(!response.ok) {
        throw new Error(`Eroare server: ${response.status}`);
      }


      const data=await response.json();
      setResult(data);
    } catch (error:unknown) {
      if(error instanceof Error) {
        setError(error.message)
      } else {
        setError("Eroare necunoscuta;")
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <VStack gap={4} w="full" pt={4} align="stretch">
      <Textarea
        placeholder="Paste an article, social media post, message, or any suspicious text..."
        value={text}
        onChange={(e:any) => setText(e.target.value)}
        disabled={isLoading}
        minH="180px"
        bg="white"
      />


      <Button
        onClick={handleAnalyze}
        disabled={!text.trim() || isLoading}
        colorScheme="blue"
        size="lg"
      >
        {isLoading ? <Spinner size="sm" mr={2} /> : null}
        Analyze Text
      </Button>


      {error && (
        <Box
          w="full"
          p={3}
          bg="red.50"
          borderRadius="md"
          border="1px solid"
          borderColor="red.200"
        >
          <Text color="red.600" fontSize="sm">
            {error}
          </Text>
        </Box>
      )}


      {result && (
        <VStack w="full" gap={3} align="start">
          <Box
            w="full"
            p={4}
            bg="gray.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <VStack align="start" gap={2} w="full">
              <HStack justify="space-between" w="full">
                <VStack align="start" gap={1}>
                  <Text fontWeight="bold" fontSize="lg">
                    ⚠️ Risk Score: {result.fusion.final_score}/100
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {result.fusion.verdict}
                  </Text>
                </VStack>


                <Badge
                  colorScheme={
                    RISK_LEVEL_COLOR[result.fusion.risk_level] ?? "gray"
                  }
                  fontSize="sm"
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  {result.fusion.risk_level}
                </Badge>
              </HStack>


              {result.location && (
                <Text fontSize="sm" color="gray.600">
                  Detected location: {result.location.country_name} (
                  {result.location.country_code})
                </Text>
              )}
            </VStack>
          </Box>


          <Text fontWeight="semibold" fontSize="sm" color="gray.700">
            Claims verified:
          </Text>


          <VStack w="full" gap={2} align="start">
            {result.claims.map((claim, idx) => (
              <Box
                key={idx}
                w="full"
                p={3}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
              >
                <HStack align="start" gap={2}>
                  <Text>{VERDICT_ICON[claim.verdict]}</Text>


                  <VStack align="start" gap={0} flex={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      "{claim.claim}"
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {claim.reasoning}
                    </Text>
                  </VStack>


                  <Badge
                    ml="auto"
                    colorScheme={
                      claim.verdict === "TRUE"
                        ? "green"
                        : claim.verdict === "FALSE"
                          ? "red"
                          : "yellow"
                    }
                    fontSize="xs"
                  >
                    {claim.verdict}
                  </Badge>
                </HStack>
              </Box>
            ))}
          </VStack>
        </VStack>
      )}
    </VStack>
  )
}
