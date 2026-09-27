import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/supabase/vendor";
import { ProductForm } from "@/components/vendor-management/forms";
import { saveProduct } from "@/lib/vendor-management/actions";
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { client, id } = await requireBusiness(); const productId = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(productId)) notFound();
  const { data, error } = await client.from("products").select("id,name,description,price,is_active").eq("id", productId).eq("vendor_id", id).maybeSingle();
  if (error) throw new Error("Unable to load product."); if (!data) notFound();
  return <><h1 className="mb-7 font-serif text-4xl">Edit product</h1><ProductForm action={saveProduct} initial={data} /></>;
}
