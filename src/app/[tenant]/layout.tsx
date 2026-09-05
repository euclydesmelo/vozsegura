import { getTenantBySlug } from "@/lib/tenant";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  await getTenantBySlug(slug); // 404 se o slug não existir

  return <div className="min-h-full flex flex-col">{children}</div>;
}
