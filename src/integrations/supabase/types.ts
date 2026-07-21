export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          category_id: string
          created_at: string
          id: string
          month: string
          planned_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          month: string
          planned_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          month?: string
          planned_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          archived: boolean
          color: string | null
          created_at: string
          id: string
          is_fixed: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          created_at?: string
          id?: string
          is_fixed?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          created_at?: string
          id?: string
          is_fixed?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          created_at: string
          detected_month: string | null
          filename: string | null
          id: string
          rows_ok: number
          rows_skipped: number
          user_id: string
        }
        Insert: {
          created_at?: string
          detected_month?: string | null
          filename?: string | null
          id?: string
          rows_ok?: number
          rows_skipped?: number
          user_id: string
        }
        Update: {
          created_at?: string
          detected_month?: string | null
          filename?: string | null
          id?: string
          rows_ok?: number
          rows_skipped?: number
          user_id?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_settings: {
        Row: {
          income_planned: number
          month: string
          notes: string | null
          starting_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          income_planned?: number
          month: string
          notes?: string | null
          starting_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          income_planned?: number
          month?: string
          notes?: string | null
          starting_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string | null
          gsheet_apps_script_url: string | null
          gsheet_last_synced_at: string | null
          gsheet_url: string | null
          id: string
          seeded_at: string | null
          starting_balance: number
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string | null
          gsheet_apps_script_url?: string | null
          gsheet_last_synced_at?: string | null
          gsheet_url?: string | null
          id: string
          seeded_at?: string | null
          starting_balance?: number
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string | null
          gsheet_apps_script_url?: string | null
          gsheet_last_synced_at?: string | null
          gsheet_url?: string | null
          id?: string
          seeded_at?: string | null
          starting_balance?: number
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_budgets: {
        Row: {
          budget_amount: number
          list: Database["public"]["Enums"]["shopping_list_kind"]
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_amount?: number
          list: Database["public"]["Enums"]["shopping_list_kind"]
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_amount?: number
          list?: Database["public"]["Enums"]["shopping_list_kind"]
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          category_id: string | null
          created_at: string
          estimated_cost: number
          id: string
          list: Database["public"]["Enums"]["shopping_list_kind"]
          month: string | null
          name: string
          notes: string | null
          priority: number
          purchased_on: string | null
          purchased_price: number | null
          status: Database["public"]["Enums"]["shopping_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          estimated_cost?: number
          id?: string
          list?: Database["public"]["Enums"]["shopping_list_kind"]
          month?: string | null
          name: string
          notes?: string | null
          priority?: number
          purchased_on?: string | null
          purchased_price?: number | null
          status?: Database["public"]["Enums"]["shopping_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          estimated_cost?: number
          id?: string
          list?: Database["public"]["Enums"]["shopping_list_kind"]
          month?: string | null
          name?: string
          notes?: string | null
          priority?: number
          purchased_on?: string | null
          purchased_price?: number | null
          status?: Database["public"]["Enums"]["shopping_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_tags: {
        Row: {
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Update: {
          tag_id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          import_id: string | null
          is_recurring: boolean
          kind: Database["public"]["Enums"]["txn_kind"]
          merchant_id: string | null
          notes: string | null
          occurred_on: string
          payment_method_id: string | null
          source: Database["public"]["Enums"]["txn_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          import_id?: string | null
          is_recurring?: boolean
          kind?: Database["public"]["Enums"]["txn_kind"]
          merchant_id?: string | null
          notes?: string | null
          occurred_on: string
          payment_method_id?: string | null
          source?: Database["public"]["Enums"]["txn_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          import_id?: string | null
          is_recurring?: boolean
          kind?: Database["public"]["Enums"]["txn_kind"]
          merchant_id?: string | null
          notes?: string | null
          occurred_on?: string
          payment_method_id?: string | null
          source?: Database["public"]["Enums"]["txn_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_budgets: {
        Row: {
          activities_per_day: number
          created_at: string
          food_per_day: number
          hotel_per_night: number
          id: string
          name: string
          stay_length: number
          transport_per_day: number
          travel: number
          updated_at: string
          user_id: string
          visa: number
        }
        Insert: {
          activities_per_day?: number
          created_at?: string
          food_per_day?: number
          hotel_per_night?: number
          id?: string
          name: string
          stay_length?: number
          transport_per_day?: number
          travel?: number
          updated_at?: string
          user_id: string
          visa?: number
        }
        Update: {
          activities_per_day?: number
          created_at?: string
          food_per_day?: number
          hotel_per_night?: number
          id?: string
          name?: string
          stay_length?: number
          transport_per_day?: number
          travel?: number
          updated_at?: string
          user_id?: string
          visa?: number
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          cost: number
          created_at: string
          id: string
          name: string
          notes: string | null
          priority: number
          purchased_on: string | null
          status: Database["public"]["Enums"]["wishlist_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          priority?: number
          purchased_on?: string | null
          status?: Database["public"]["Enums"]["wishlist_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          priority?: number
          purchased_on?: string | null
          status?: Database["public"]["Enums"]["wishlist_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      category_kind: "expense" | "income"
      shopping_list_kind: "personal" | "grocery"
      shopping_status: "pending" | "purchased" | "skipped"
      txn_kind: "expense" | "income"
      txn_source: "manual" | "import" | "seed"
      wishlist_status: "to_buy" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      category_kind: ["expense", "income"],
      shopping_list_kind: ["personal", "grocery"],
      shopping_status: ["pending", "purchased", "skipped"],
      txn_kind: ["expense", "income"],
      txn_source: ["manual", "import", "seed"],
      wishlist_status: ["to_buy", "done"],
    },
  },
} as const
