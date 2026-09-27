import Link from "next/link";
import { requireBusiness } from "@/lib/supabase/vendor";
import { ActionForm, ImageForm } from "@/components/vendor-management/forms";
import { deactivateProduct } from "@/lib/vendor-management/actions";
import { uploadImage } from "@/lib/vendor-management/media-actions";
export default async function Products({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { client, id } = await requireBusiness();
  const { data, error } = await client.from("products").select("id,name,price,is_active").eq("vendor_id", id).order("created_at").order("id");
  if (error) throw new Error("Unable to load products.");
  return <><div className="mb-7 flex flex-wrap items-center justify-between gap-4"><h1 className="font-serif text-4xl">Products</h1><Link href="/dashboard/products/new" className="inline-flex min-h-12 items-center rounded-xl bg-hutan px-5 text-white">Add product</Link></div>{(await searchParams).saved && <p role="status" className="mb-5 rounded-xl bg-rembulan/40 p-4">Product saved.</p>}<div className="space-y-5">{data.map((product) => <article key={product.id} className="rounded-2xl border border-hutan/15 bg-white p-5"><h2 className="font-serif text-2xl">{product.name}</h2><p role="status" className="mt-2 text-sm">{product.is_active ? "Active" : "Inactive"} · {product.price === null ? "No price listed" : `RM ${product.price.toFixed(2)}`}</p><Link className="my-3 inline-flex min-h-11 items-center underline" href={`/dashboard/products/${product.id}/edit`}>Edit product</Link>{product.is_active && <ActionForm action={deactivateProduct} label="Deactivate product"><input type="hidden" name="id" value={product.id} /></ActionForm>}<details className="mt-5 border-t border-hutan/10 pt-4"><summary className="min-h-11 cursor-pointer py-2">Product image</summary><ImageForm action={uploadImage} kind="product" productId={product.id} /></details></article>)}{!data.length && <p className="rounded-xl border border-dashed border-hutan/25 p-6">No products yet. Add your first item.</p>}</div></>;
}
