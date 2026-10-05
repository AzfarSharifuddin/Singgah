// Prepared from the versioned Sprint 1 migrations; NOT generated from hosted Supabase.
// Replace with Supabase-generated public-schema types after migrations are applied.
// Row shapes include private columns; public SELECTs must explicitly omit identities.

type statesRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  country_code: "MY";
};

type citiesRow = {
  id: string;
  created_at: string;
  updated_at: string;
  state_id: string;
  name: string;
  slug: string;
  kind: "city" | "district";
};

type areasRow = {
  id: string;
  created_at: string;
  updated_at: string;
  city_id: string;
  name: string;
  slug: string;
};

type categoriesRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  display_order: number;
};

type subcategoriesRow = {
  id: string;
  created_at: string;
  updated_at: string;
  category_id: string;
  name: string;
  slug: string;
  display_order: number;
};

type vendorsRow = {
  id: string;
  created_at: string;
  updated_at: string;
  owner_user_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  category_id: string;
  subcategory_id: string | null;
  state_id: string;
  city_id: string;
  area_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  location_notes: string | null;
  phone: string | null;
  whatsapp: string | null;
  website_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  status: "draft" | "pending" | "published" | "suspended" | "archived";
  is_active: boolean;
};

type productsRow = {
  id: string;
  created_at: string;
  updated_at: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency_code: "MYR";
  is_active: boolean;
  display_order: number;
};

type vendor_imagesRow = {
  id: string;
  created_at: string;
  updated_at: string;
  vendor_id: string;
  product_id: string | null;
  storage_path: string;
  image_type: "logo" | "cover" | "gallery" | "product";
  alt_text: string | null;
  display_order: number;
  is_public: boolean;
};

type reviewsRow = {
  id: string;
  created_at: string;
  updated_at: string;
  vendor_id: string;
  customer_id: string | null;
  rating: number;
  review_text: string | null;
  reviewer_name: string | null;
  status: "pending" | "published" | "rejected" | "flagged";
  verification_status: "unverified" | "verified";
  terms_version: string | null;
  terms_accepted_at: string | null;
};

type product_ratingsRow = {
  id: string;
  created_at: string;
  updated_at: string;
  review_id: string;
  product_id: string;
  vendor_id: string;
  rating: number;
};

export type Database = {
  public: {
    Tables: {
      states: {
        Row: statesRow;
        Insert: Partial<statesRow> & Pick<statesRow, "name" | "slug">;
        Update: Partial<statesRow>;
        Relationships: [];
      };
      cities: {
        Row: citiesRow;
        Insert: Partial<citiesRow> & Pick<citiesRow, "state_id" | "name" | "slug">;
        Update: Partial<citiesRow>;
        Relationships: [{ foreignKeyName: "cities_state_id_fkey"; columns: ["state_id"]; isOneToOne: false; referencedRelation: "states"; referencedColumns: ["id"] }];
      };
      areas: {
        Row: areasRow;
        Insert: Partial<areasRow> & Pick<areasRow, "city_id" | "name" | "slug">;
        Update: Partial<areasRow>;
        Relationships: [{ foreignKeyName: "areas_city_id_fkey"; columns: ["city_id"]; isOneToOne: false; referencedRelation: "cities"; referencedColumns: ["id"] }];
      };
      categories: {
        Row: categoriesRow;
        Insert: Partial<categoriesRow> & Pick<categoriesRow, "name" | "slug">;
        Update: Partial<categoriesRow>;
        Relationships: [];
      };
      subcategories: {
        Row: subcategoriesRow;
        Insert: Partial<subcategoriesRow> & Pick<subcategoriesRow, "category_id" | "name" | "slug">;
        Update: Partial<subcategoriesRow>;
        Relationships: [{ foreignKeyName: "subcategories_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] }];
      };
      vendors: {
        Row: vendorsRow;
        Insert: Partial<vendorsRow> & Pick<vendorsRow, "name" | "slug" | "category_id" | "state_id" | "city_id">;
        Update: Partial<vendorsRow>;
        Relationships: [{ foreignKeyName: "vendors_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] }, { foreignKeyName: "vendors_subcategory_id_category_id_fkey"; columns: ["subcategory_id","category_id"]; isOneToOne: false; referencedRelation: "subcategories"; referencedColumns: ["id","category_id"] }, { foreignKeyName: "vendors_state_id_fkey"; columns: ["state_id"]; isOneToOne: false; referencedRelation: "states"; referencedColumns: ["id"] }, { foreignKeyName: "vendors_city_id_state_id_fkey"; columns: ["city_id","state_id"]; isOneToOne: false; referencedRelation: "cities"; referencedColumns: ["id","state_id"] }, { foreignKeyName: "vendors_area_id_city_id_fkey"; columns: ["area_id","city_id"]; isOneToOne: false; referencedRelation: "areas"; referencedColumns: ["id","city_id"] }];
      };
      products: {
        Row: productsRow;
        Insert: Partial<productsRow> & Pick<productsRow, "vendor_id" | "name">;
        Update: Partial<productsRow>;
        Relationships: [{ foreignKeyName: "products_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] }];
      };
      vendor_images: {
        Row: vendor_imagesRow;
        Insert: Partial<vendor_imagesRow> & Pick<vendor_imagesRow, "vendor_id" | "storage_path" | "image_type">;
        Update: Partial<vendor_imagesRow>;
        Relationships: [{ foreignKeyName: "vendor_images_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] }, { foreignKeyName: "vendor_images_product_id_vendor_id_fkey"; columns: ["product_id","vendor_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id","vendor_id"] }];
      };
      reviews: {
        Row: reviewsRow;
        Insert: Partial<reviewsRow> & Pick<reviewsRow, "vendor_id" | "rating">;
        Update: Partial<reviewsRow>;
        Relationships: [{ foreignKeyName: "reviews_vendor_id_fkey"; columns: ["vendor_id"]; isOneToOne: false; referencedRelation: "vendors"; referencedColumns: ["id"] }];
      };
      product_ratings: {
        Row: product_ratingsRow;
        Insert: Partial<product_ratingsRow> & Pick<product_ratingsRow, "review_id" | "product_id" | "vendor_id" | "rating">;
        Update: Partial<product_ratingsRow>;
        Relationships: [{ foreignKeyName: "product_ratings_review_id_vendor_id_fkey"; columns: ["review_id","vendor_id"]; isOneToOne: false; referencedRelation: "reviews"; referencedColumns: ["id","vendor_id"] }, { foreignKeyName: "product_ratings_product_id_vendor_id_fkey"; columns: ["product_id","vendor_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id","vendor_id"] }];
      };
    };
    Views: {
      vendor_rating_summaries: {
        Row: { vendor_id: string; review_count: number; average_rating: number | null; stars_1: number; stars_2: number; stars_3: number; stars_4: number; stars_5: number };
        Relationships: [];
      };
      product_rating_summaries: {
        Row: { product_id: string; rating_count: number; average_rating: number | null };
        Relationships: [];
      };
    };
    Functions: {
      is_singgah_admin: { Args: Record<string, never>; Returns: boolean };
      admin_vendor_list: { Args: { p_status?: string; p_search?: string; p_page?: number }; Returns: { vendors: { id: string; name: string; slug: string; description: string | null; status: string; is_active: boolean; created_at: string; category: string; state: string; city: string; last_reason: string | null }[]; total: number; page: number; pages: number } };
      admin_moderate_vendor: { Args: { p_id: string; p_decision: string; p_expected_status: string; p_reason?: string }; Returns: undefined };
      current_vendor_id: { Args: Record<string, never>; Returns: string | null };
      create_vendor_business: { Args: { p_profile: Record<string, string | null> }; Returns: string };
      attach_vendor_image: { Args: { p_path: string; p_kind: string; p_product?: string | null; p_alt?: string | null }; Returns: string | null };
      detach_vendor_image: { Args: { p_image: string }; Returns: string };
      has_reviewed_vendor: { Args: { p_vendor_id: string }; Returns: boolean };
      submit_customer_review: { Args: { p_payload: string; p_signature: string }; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
