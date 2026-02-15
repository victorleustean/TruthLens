"use client"
import { useCallback, useState } from "react";
import { Box, VStack, Text, Icon, Spinner } from "@chakra-ui/react";
import { createToaster } from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { useDropzone } from "react-dropzone";
import { FiUploadCloud } from "react-icons/fi";

// Definire toaster conform noilor versiuni Chakra
const toaster = createToaster({
    placement: "top",
});

export const VideoUpload = () => {
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
      
        setIsUploading(true);
        
        try {
            /**uploadare in supabase storage */
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = `uploads/${fileName}`;
      
            const { data: storageData, error: storageError } = await supabase.storage
                .from('videos')
                .upload(filePath, file);
      
            if (storageError) throw storageError;
      
            /**obtinerea url-ul public */
            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath);
      
            // 3. inserare in tabelul jobs
            const { data: jobData, error: jobError } = await supabase
                .from('jobs')
                .insert([
                    { 
                        video_url: publicUrl,
                        file_name: file.name,
                        status: 'pending' 
                    }
                ])
                .select();
      
            if (jobError) throw jobError;
      
            // succes!!
            toaster.create({ 
                title: "Analiză începută", 
                description: "Video-ul a fost trimis spre procesare.", 
                type: "success" 
            });
            
            console.log("Job creat cu succes:", jobData);
        } catch (error: any) {
            toaster.create({ 
                title: "Eroare", 
                description: error.message, 
                type: "error" 
            });
        } finally {
            setIsUploading(false);
        }
    }, []); 

    /**definire dropzone */
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': ['.mp4', '.mov', '.webm'] },
        multiple: false
    });

    return (
        <VStack gap={4} w="full">
            <Box 
                {...getRootProps()} 
                w="full" 
                h="200px" 
                border="2px dashed" 
                borderColor={isDragActive ? "blue.400" : "gray.200"}
                borderRadius="xl" 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                cursor="pointer" 
                bg={isDragActive ? "blue.50" : "gray.50"}
                _hover={{bg: "gray.100", borderColor: "blue.300"}} 
                transition="all 0.2s"
            >
                <input {...getInputProps()} />
                <VStack>
                    <Icon as={FiUploadCloud} w={10} h={10} color="blue.500"/>
                    <Text fontWeight="medium">
                        {isDragActive ? "Lasa fisierul aici..." : "Trage un videoclip aici sau da click"}
                    </Text>
                    <Text fontSize="xs" color='gray.500'>MP4, MOV sau WEBM (max. 50MB)</Text>
                </VStack>
            </Box>

            {isUploading && (
                <VStack gap={2} w="full">
                    <Text fontSize="sm">Se incarca...</Text>
                    <Spinner size="md" color="blue.500" thickness="4px" />
                </VStack>
            )}
        </VStack>
    );
};