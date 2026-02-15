"use client"

import { supabase } from "@/lib/supabase"
import { Badge, Box, Heading, Spinner, Text, VStack } from "@chakra-ui/react"
import { useEffect, useState } from "react"

type Job = {
    id:string,
    video_url:string,
    status:string,
    risk_score:number | null,
    created_at:string,
}

export const JobsList = () => {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading,setLoading]=useState(true)

    useEffect(() => {
        fetchJobs()
    }, [])

    async function fetchJobs() {
        const {data, error} =await supabase
        .from('jobs')
        .select('*')
        .order('created_at', {ascending: false})

        if(!error && data) {
            setJobs(data)
        }

        setLoading(false)
    }

    useEffect(() => {
        const channel = supabase
        .channel('jobs-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table:'jobs'},
            () => {
                fetchJobs()
            }
        )
        .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])
    
    if (loading) {
        return <Spinner size="lg" />
    }

    return (
        <VStack w="full" spacing={4} align="stretch">
      <Heading size="md">Scanări recente</Heading>

      {jobs.map((job) => (
        <Box
          key={job.id}
          p={4}
          borderWidth="1px"
          borderRadius="lg"
        >
          <Text fontSize="sm" color="gray.500">
            {new Date(job.created_at).toLocaleString()}
          </Text>

          <Badge
            colorScheme={
              job.status === 'completed'
                ? 'green'
                : job.status === 'processing'
                ? 'yellow'
                : 'blue'
            }
          >
            {job.status}
          </Badge>

          {job.risk_score !== null && (
            <Text mt={2}>
              Risk Score: {job.risk_score}%
            </Text>
          )}
        </Box>
      ))}
    </VStack>
    )
}