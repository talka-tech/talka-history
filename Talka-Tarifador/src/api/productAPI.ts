import { supabase } from '../lib/supabase'

export interface TalkaProduct {
  id: string
  name: string
  description: string
  color: string
  logo_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductMetrics {
  total_clients: number
  active_clients: number
  credits_used: number
  revenue: number
}

export interface ProductWithMetrics extends TalkaProduct {
  metrics: ProductMetrics
}

// Buscar todos os produtos
export const getAllProducts = async (): Promise<{ success: boolean; data?: TalkaProduct[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('talka_products')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

// Buscar produtos com métricas
export const getProductsWithMetrics = async (): Promise<{ success: boolean; data?: ProductWithMetrics[]; error?: string }> => {
  try {
    // Buscar produtos
    const { data: products, error: productsError } = await supabase
      .from('talka_products')
      .select('*')
      .order('created_at', { ascending: true })

    if (productsError) throw productsError

    if (!products) return { success: true, data: [] }

    // Buscar métricas para cada produto
    const productsWithMetrics = await Promise.all(
      products.map(async (product) => {
        const { data: metrics } = await supabase
          .rpc('calculate_product_metrics', { product_id_param: product.id })

        const productMetrics: ProductMetrics = {
          total_clients: metrics?.[0]?.total_clients || 0,
          active_clients: metrics?.[0]?.active_clients || 0,
          credits_used: metrics?.[0]?.total_credits_used || 0,
          revenue: metrics?.[0]?.total_revenue || 0
        }

        return {
          ...product,
          metrics: productMetrics
        }
      })
    )

    return { success: true, data: productsWithMetrics }
  } catch (error) {
    console.error('Erro ao buscar produtos com métricas:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

// Criar novo produto
export const createProduct = async (productData: {
  name: string
  description: string
  color: string
  logo_url?: string
}): Promise<{ success: boolean; data?: TalkaProduct; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('talka_products')
      .insert([productData])
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

// Atualizar produto
export const updateProduct = async (
  id: string, 
  productData: Partial<Omit<TalkaProduct, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; data?: TalkaProduct; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('talka_products')
      .update(productData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

// Deletar produto
export const deleteProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Verificar se há clientes vinculados
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('product_id', id)
      .limit(1)

    if (clientsError) throw clientsError

    if (clients && clients.length > 0) {
      return { 
        success: false, 
        error: 'Não é possível excluir um produto que possui clientes vinculados' 
      }
    }

    const { error } = await supabase
      .from('talka_products')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Erro ao deletar produto:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

// Alternar status ativo/inativo do produto
export const toggleProductStatus = async (id: string): Promise<{ success: boolean; data?: TalkaProduct; error?: string }> => {
  try {
    // Buscar produto atual
    const { data: currentProduct, error: fetchError } = await supabase
      .from('talka_products')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Alternar status
    const { data, error } = await supabase
      .from('talka_products')
      .update({ is_active: !currentProduct.is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao alternar status do produto:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

// Buscar clientes de um produto específico
export const getProductClients = async (productId: string): Promise<{ success: boolean; data?: any[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('clients_with_products')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Erro ao buscar clientes do produto:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

export default {
  getAllProducts,
  getProductsWithMetrics,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getProductClients
}
