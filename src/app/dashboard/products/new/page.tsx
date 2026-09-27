import { requireBusiness } from "@/lib/supabase/vendor";
import { ProductForm } from "@/components/vendor-management/forms";
import { saveProduct } from "@/lib/vendor-management/actions";
export default async function NewProduct() { await requireBusiness(); return <><h1 className="mb-7 font-serif text-4xl">Add product</h1><ProductForm action={saveProduct} /></>; }
