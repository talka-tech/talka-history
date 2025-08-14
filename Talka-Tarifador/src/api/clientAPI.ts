import { supabase, Client, UsageHistory } from '@/lib/supabase'

// Simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface CreateUsageData {
  client_id: number
  credits_consumed: number
  description?: string
}

interface CreateClientData {
  name: string // Nome da empresa
  login: string // Login único do cliente
  type: "projeto" | "individual"
  credits_total: number
  password: string // Senha do cliente
  product: string // Nome do produto Talka
}

class ClientAPI {
  
  // Get all clients (admin only)
  async getAllClients(): Promise<Client[]> {
    await delay(300)
    
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          *,
          talka_products!clients_product_id_fkey (
            id,
            name,
            description,
            color,
            logo_url
          )
        `)
        .order('id', { ascending: true })

      if (error) {
        console.error('Error fetching clients:', error)
        throw error
      }

      // Transform data to include product_name for compatibility
      const transformedClients = clients?.map(client => ({
        ...client,
        product_name: client.talka_products?.name || 'Talka Geral',
        product: client.talka_products?.name || 'Talka Geral'
      })) || []

      console.log('📊 Fetched clients from database:', transformedClients?.length || 0)
      return transformedClients
    } catch (error) {
      console.error('Error in getAllClients:', error)
      throw error
    }
  }

  // Create a new client (admin only)
  async createClient(data: CreateClientData): Promise<{ success: boolean; message: string; client?: Client }> {
    await delay(600)
    
    try {
      console.log('🔧 Creating client with data:', data)
      
      // Get the current admin user ID (assuming admin is always user ID 1)
      const currentAdminId = 1 // TODO: Get from auth context
      
      // First, get the product ID from the product name
      const { data: product, error: productError } = await supabase
        .from('talka_products')
        .select('id')
        .eq('name', data.product)
        .single()

      if (productError || !product) {
        console.error('❌ Error finding product:', productError)
        return {
          success: false,
          message: `Produto "${data.product}" não encontrado`
        }
      }
      
      // Create client directly in clients table
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          login: data.login,
          password: data.password,
          type: data.type,
          credits_total: data.credits_total,
          credits_used: 0,
          is_active: true,
          created_by: currentAdminId,
          product_id: product.id
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating client:', error)
        
        if (error.code === '23505') { // Unique constraint violation
          return {
            success: false,
            message: 'Login já existe. Escolha outro login.'
          }
        }
        
        return {
          success: false,
          message: `Erro ao criar cliente: ${error.message}`
        }
      }

      console.log('✅ Client created successfully:', newClient)
      
      return {
        success: true,
        message: 'Cliente criado com sucesso',
        client: newClient
      }
    } catch (error) {
      console.error('❌ Unexpected error creating client:', error)
      return {
        success: false,
        message: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  // Update client credentials (admin only)
  async updateClientCredentials(clientId: number, login: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔧 Updating client credentials for ID:', clientId)
      
      const { error } = await supabase
        .from('clients')
        .update({
          login: login,
          password: password
        })
        .eq('id', clientId)

      if (error) {
        console.error('❌ Error updating client credentials:', error)
        return {
          success: false,
          message: 'Erro ao atualizar credenciais'
        }
      }

      console.log('✅ Client credentials updated successfully')
      return {
        success: true,
        message: 'Credenciais atualizadas com sucesso'
      }
    } catch (error) {
      console.error('Error updating client credentials:', error)
      return {
        success: false,
        message: 'Erro ao atualizar credenciais'
      }
    }
  }

  // Delete a client (admin only)
  async deleteClient(clientId: number): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) {
        console.error('Error deleting client:', error)
        return {
          success: false,
          message: 'Erro ao deletar cliente'
        }
      }

      return {
        success: true,
        message: 'Cliente deletado com sucesso'
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      return {
        success: false,
        message: 'Erro ao deletar cliente'
      }
    }
  }

  // Update client credits (admin only)
  async updateClientCredits(clientId: number, newCredits: number): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ credits_total: newCredits })
        .eq('id', clientId)

      if (error) {
        console.error('Error updating client credits:', error)
        return {
          success: false,
          message: 'Erro ao atualizar créditos'
        }
      }

      return {
        success: true,
        message: 'Créditos atualizados com sucesso'
      }
    } catch (error) {
      console.error('Error updating client credits:', error)
      return {
        success: false,
        message: 'Erro ao atualizar créditos'
      }
    }
  }

  // Update client information (name, etc.)
  async updateClient(clientId: number, updates: { name?: string }): Promise<{ success: boolean; message: string }> {
    await delay(300)
    
    try {
      const { data: updatedClient, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single()

      if (error) {
        console.error('Error updating client:', error)
        return {
          success: false,
          message: `Erro ao atualizar cliente: ${error.message}`
        }
      }

      return {
        success: true,
        message: 'Cliente atualizado com sucesso'
      }
    } catch (error) {
      console.error('Unexpected error updating client:', error)
      return {
        success: false,
        message: 'Erro ao atualizar cliente'
      }
    }
  }

  // Toggle client status (admin only)
  async toggleClientStatus(clientId: number): Promise<{ success: boolean; message: string }> {
    try {
      // First get current status
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('is_active')
        .eq('id', clientId)
        .single()

      if (fetchError) throw fetchError

      // Toggle status
      const { error } = await supabase
        .from('clients')
        .update({ is_active: !client.is_active })
        .eq('id', clientId)

      if (error) throw error

      return {
        success: true,
        message: `Cliente ${!client.is_active ? 'ativado' : 'desativado'} com sucesso`
      }
    } catch (error) {
      console.error('Error toggling client status:', error)
      return {
        success: false,
        message: 'Erro ao alterar status do cliente'
      }
    }
  }

  // Add usage record (for clients when they use credits)
  async addUsage(data: CreateUsageData): Promise<{ success: boolean; message: string }> {
    try {
      // Insert usage record
      const { error: usageError } = await supabase
        .from('usage_history')
        .insert({
          client_id: data.client_id,
          credits_consumed: data.credits_consumed,
          description: data.description
        })

      if (usageError) throw usageError

      // Update client credits_used
      const { error: updateError } = await supabase
        .rpc('increment', {
          table_name: 'clients',
          row_id: data.client_id,
          column_name: 'credits_used',
          amount: data.credits_consumed
        })

      if (updateError) {
        // Fallback: manual update
        const { data: client, error: fetchError } = await supabase
          .from('clients')
          .select('credits_used')
          .eq('id', data.client_id)
          .single()

        if (!fetchError && client) {
          await supabase
            .from('clients')
            .update({ 
              credits_used: client.credits_used + data.credits_consumed,
              last_usage: new Date().toISOString()
            })
            .eq('id', data.client_id)
        }
      }

      return {
        success: true,
        message: 'Uso registrado com sucesso'
      }
    } catch (error) {
      console.error('Error adding usage:', error)
      return {
        success: false,
        message: 'Erro ao registrar uso'
      }
    }
  }

  // Get usage history for a client
  async getUsageHistory(clientId: number): Promise<UsageHistory[]> {
    try {
      const { data, error } = await supabase
        .from('usage_history')
        .select('*')
        .eq('client_id', clientId)
        .order('usage_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching usage history:', error)
      return []
    }
  }
}

export const clientAPI = new ClientAPI()
export type { CreateClientData, CreateUsageData }
