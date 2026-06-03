export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'seller'
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: 'admin' | 'seller'
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          full_name?: string
          role?: 'admin' | 'seller'
          avatar_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          name: string
          created_at: string
        }
        Insert: {
          name: string
          created_at?: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: number
          category_id: number | null
          name: string
          price: number
          stock: number
          min_stock: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          category_id?: number | null
          name: string
          price: number
          stock?: number
          min_stock?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          category_id?: number | null
          name?: string
          price?: number
          stock?: number
          min_stock?: number
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      sales: {
        Row: {
          id: number
          user_id: string | null
          total: number
          payment_method: PaymentMethod
          created_at: string
        }
        Insert: {
          user_id?: string | null
          total: number
          payment_method: PaymentMethod
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'sales_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sale_details: {
        Row: {
          id: number
          sale_id: number
          product_id: number | null
          quantity: number
          unit_price: number
          subtotal: number
        }
        Insert: {
          sale_id: number
          product_id?: number | null
          quantity: number
          unit_price: number
          subtotal: number
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'sale_details_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_details_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      dashboard_today: {
        Row: {
          sale_date: string
          sales_count: number
          total_sold: number
        }
        Relationships: []
      }
      low_stock_products: {
        Row: {
          id: number
          name: string
          stock: number
          min_stock: number
          price: number
          category_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_role: {
        Args: Record<string, never>
        Returns: 'admin' | 'seller' | null
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      set_profile_role: {
        Args: {
          p_user_id: string
          p_role: 'admin' | 'seller'
        }
        Returns: void
      }
      register_sale: {
        Args: {
          p_items: Json
          p_payment_method: PaymentMethod
        }
        Returns: number
      }
    }
  }
}

export type PaymentMethod = 'cash' | 'card' | 'yape' | 'plin' | 'transfer'
