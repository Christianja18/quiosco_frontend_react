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
          role: UserRole
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          full_name?: string
          role?: UserRole
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
      consumer_types: {
        Row: {
          id: number
          code: ConsumerTypeCode
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          code: ConsumerTypeCode
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          code?: ConsumerTypeCode
          name?: string
          is_active?: boolean
        }
        Relationships: []
      }
      consumers: {
        Row: {
          id: number
          consumer_type_id: number
          first_names: string
          last_names: string
          document_number: string | null
          grade_section: string | null
          phone: string | null
          email: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          consumer_type_id: number
          first_names: string
          last_names: string
          document_number?: string | null
          grade_section?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          consumer_type_id?: number
          first_names?: string
          last_names?: string
          document_number?: string | null
          grade_section?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'consumers_consumer_type_id_fkey'
            columns: ['consumer_type_id']
            isOneToOne: false
            referencedRelation: 'consumer_types'
            referencedColumns: ['id']
          },
        ]
      }
      order_status: {
        Row: {
          id: number
          code: OrderStatusCode
          name: string
          created_at: string
        }
        Insert: {
          code: OrderStatusCode
          name: string
          created_at?: string
        }
        Update: {
          code?: OrderStatusCode
          name?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: number
          consumer_id: number
          user_id: string | null
          status_id: number
          notes: string | null
          total: number
          created_at: string
        }
        Insert: {
          consumer_id: number
          user_id?: string | null
          status_id: number
          notes?: string | null
          total?: number
          created_at?: string
        }
        Update: {
          consumer_id?: number
          user_id?: string | null
          status_id?: number
          notes?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'orders_consumer_id_fkey'
            columns: ['consumer_id']
            isOneToOne: false
            referencedRelation: 'consumers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_status_id_fkey'
            columns: ['status_id']
            isOneToOne: false
            referencedRelation: 'order_status'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      order_details: {
        Row: {
          id: number
          order_id: number
          product_id: number | null
          quantity: number
          unit_price: number
          subtotal: number
        }
        Insert: {
          order_id: number
          product_id?: number | null
          quantity: number
          unit_price: number
          subtotal: number
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'order_details_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_details_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      sales: {
        Row: {
          id: number
          user_id: string | null
          order_id: number | null
          total: number
          payment_method: PaymentMethod
          created_at: string
        }
        Insert: {
          user_id?: string | null
          order_id?: number | null
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
          {
            foreignKeyName: 'sales_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
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
      orders_with_details: {
        Row: {
          id: number
          consumer_id: number
          user_id: string | null
          consumer_type_code: ConsumerTypeCode
          consumer_type_name: string
          first_names: string
          last_names: string
          email: string | null
          grade_section: string | null
          status_code: OrderStatusCode
          status_name: string
          notes: string | null
          total: number
          created_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_role: {
        Args: Record<string, never>
        Returns: UserRole | null
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      can_operate: {
        Args: Record<string, never>
        Returns: boolean
      }
      can_request_order: {
        Args: Record<string, never>
        Returns: boolean
      }
      set_profile_role: {
        Args: {
          p_user_id: string
          p_role: UserRole
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
      create_order: {
        Args: {
          p_consumer_id: number
          p_items: Json
          p_notes?: string | null
        }
        Returns: number
      }
      complete_order: {
        Args: {
          p_order_id: number
          p_payment_method: PaymentMethod
        }
        Returns: number
      }
      cancel_order: {
        Args: {
          p_order_id: number
        }
        Returns: void
      }
    }
  }
}

export type PaymentMethod = 'cash' | 'yape' | 'plin'
export type ConsumerTypeCode = 'STUDENT' | 'TEACHER'
export type OrderStatusCode = 'PENDING' | 'COMPLETED' | 'CANCELLED'
export type UserRole = 'admin' | 'seller' | 'profesor' | 'alumno'
