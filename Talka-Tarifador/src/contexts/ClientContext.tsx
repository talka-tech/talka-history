import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCurrentClient, ClientData } from "@/data/mockData";

interface ClientContextType {
  client: ClientData | null;
  loading: boolean;
  reloadClient: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType>({
  client: null,
  loading: true,
  reloadClient: async () => {},
});

export function ClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClient = async () => {
    setLoading(true);
    try {
      const data = await getCurrentClient();
      setClient(data);
    } catch (e) {
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
    // Listen for updates
    const handler = () => loadClient();
    window.addEventListener("clientDataUpdated", handler);
    return () => window.removeEventListener("clientDataUpdated", handler);
  }, []);

  return (
    <ClientContext.Provider value={{ client, loading, reloadClient: loadClient }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  return useContext(ClientContext);
}
