import { EnglishServicePage } from "@/components/english-service-page";
import { englishServices, englishServiceMetadata } from "@/lib/english-services";

const content = englishServices[1];
export const metadata = englishServiceMetadata(content);
export default function Page() { return <EnglishServicePage content={content} />; }
