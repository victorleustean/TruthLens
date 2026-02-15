'use client'
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";

const system = createSystem(defaultConfig);

export function Providers({ children}: {children: React.ReactNode})  
{
    return (
        <ChakraProvider value={system}>
            {children}
        </ChakraProvider>
    )
}