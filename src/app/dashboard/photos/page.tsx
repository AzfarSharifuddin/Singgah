import Link from "next/link";
import { requireBusiness, ownProfile } from "@/lib/supabase/vendor";
import { ActionForm, ImageForm, ProofImageForm } from "@/components/vendor-management/forms";
import { ProfileImage } from "@/components/vendor/profile-image";
import { PrivateProofImage } from "@/components/vendor-management/private-proof-image";
import { uploadImage, removeImage, cleanupImages, uploadProofImage, removeProofImage } from "@/lib/vendor-management/media-actions";
export default async function Photos({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const { client, id } = await requireBusiness(); const vendor = await ownProfile();
  const { data, error } = await client.from("vendor_images").select("id,storage_path,image_type,alt_text").eq("vendor_id", id).neq("image_type", "product").order("created_at");
  if (error) throw new Error("Unable to load photos.");
  const signed = data.length ? await client.storage.from("vendor-media").createSignedUrls(data.map((image) => image.storage_path), 600) : null;
  const urls = new Map(signed?.data?.map((image) => [image.path, image.signedUrl]));
  const { data: proofImages, error: proofError } = await client.from("vendor_verification_images").select("id,storage_path,evidence_type,created_at").eq("vendor_id", id).order("created_at");
  if (proofError) throw new Error("Unable to load private proof photos.");
  const signedProof = proofImages.length ? await client.storage.from("vendor-verification").createSignedUrls(proofImages.map((image) => image.storage_path), 600) : null;
  const proofUrls = new Map(signedProof?.data?.map((image) => [image.path, image.signedUrl]));
  const proofLabels: Record<string, string> = { storefront: "Storefront or stall", signage: "Business sign or name", products: "Products or work", workspace: "Workspace", other: "Other business evidence" };
  return <>
    <h1 className="font-serif text-4xl">Business photos</h1>
    {(await searchParams).onboarding && <section className="my-6 rounded-xl bg-rembulan/40 p-5"><h2 className="text-xl font-semibold">{vendor.name} is set up.</h2><p className="my-3">Your profile is awaiting approval. Add optional branding or private proof photos below, or finish now.</p><Link href="/dashboard" className="inline-flex min-h-12 items-center rounded-xl bg-hutan px-5 text-white">Finish & open dashboard</Link></section>}
    <p className="mb-7 mt-3 text-sm">Add one logo, one cover and up to eight gallery photos. Product images are managed under Products.</p>
    <div className="grid gap-5 xl:grid-cols-2">{["logo","cover","gallery"].map((kind) => <section key={kind} className="rounded-2xl border border-hutan/15 bg-white p-5"><h2 className="mb-5 font-serif text-2xl capitalize">{kind}</h2><ImageForm action={uploadImage} kind={kind} /></section>)}</div>
    <h2 className="mb-5 mt-9 font-serif text-2xl">Your profile images</h2>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.map((image) => <article key={image.id} className="rounded-2xl border border-hutan/15 bg-white p-4"><ProfileImage src={urls.get(image.storage_path) || null} alt={image.alt_text || `${image.image_type} image`} className="aspect-square rounded-xl" sizes="320px" /><p className="my-3 text-sm capitalize">{image.image_type}</p><ActionForm action={removeImage} label="Remove image"><input type="hidden" name="image_id" value={image.id} /></ActionForm></article>)}</div>
    {!data.length && <p className="py-4 text-sm">No profile images uploaded yet.</p>}
    <section className="mt-10 border-t border-hutan/15 pt-8" aria-labelledby="proof-heading">
      <h2 id="proof-heading" className="font-serif text-3xl">Private business proof</h2>
      <p className="mb-6 mt-3 max-w-2xl text-sm leading-6 text-[#5d665f]">Help Singgah review your business by showing your storefront, sign, products or workspace. Only you and Singgah admins can view these photos. They will not appear on your public profile.</p>
      {proofImages.length < 5 && <div className="mb-8 max-w-xl rounded-2xl border border-hutan/15 bg-white p-5"><ProofImageForm action={uploadProofImage} /></div>}
      <h3 className="mb-4 font-serif text-2xl">Submitted proof photos ({proofImages.length}/5)</h3>
      {proofImages.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{proofImages.map((image) => <article key={image.id} className="rounded-2xl border border-hutan/15 bg-white p-4"><PrivateProofImage src={proofUrls.get(image.storage_path)} alt={`${proofLabels[image.evidence_type] || "Business proof"} uploaded for admin review`} className="aspect-square rounded-xl" /><p className="my-3 text-sm">{proofLabels[image.evidence_type] || "Business evidence"}</p><ActionForm action={removeProofImage} label="Remove proof photo"><input type="hidden" name="image_id" value={image.id} /></ActionForm></article>)}</div> : <p className="rounded-xl border border-dashed border-hutan/25 p-5 text-sm">No proof photos uploaded yet.</p>}
    </section>
    <details className="mt-8"><summary className="min-h-11 cursor-pointer py-2">Upload maintenance</summary><p className="my-3 text-sm">Safely remove unused files left by interrupted uploads. Current profile images are kept.</p><ActionForm action={cleanupImages} label="Clean unused uploads"><span /></ActionForm></details>
  </>;
}
