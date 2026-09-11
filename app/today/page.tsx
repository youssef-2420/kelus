import { cookies } from "next/headers";
import { ROUTE_FLAG } from "@/lib/route-flag";
import { TodayClient } from "./TodayClient";

type TodayPageProps = {
  searchParams?: Promise<{ sample?: string | string[] }>;
};

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const jar = await cookies();
  const hasRouteHint = jar.get(ROUTE_FLAG)?.value === "1";
  const params = searchParams ? await searchParams : {};
  const sample = Array.isArray(params.sample) ? params.sample[0] : params.sample;
  const wantsSample = sample === "1";

  return <TodayClient hasRouteHint={hasRouteHint} wantsSample={wantsSample} />;
}
