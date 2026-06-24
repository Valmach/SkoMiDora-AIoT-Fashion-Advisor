import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center space-y-6 text-center p-4">
      {/* 404 Text */}
      <h1 className="text-[150px] font-black text-[#DC143C] leading-none tracking-tighter opacity-90">
        404
      </h1>
      
      {/* Description */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-wide uppercase">
          Page Not Found
        </h2>
        <p className="text-zinc-500 max-w-md mx-auto">
          The style destination you are looking for does not exist or has been moved.
        </p>
      </div>

      {/* Back Home Button */}
      <Link href="/">
        <Button 
          variant="outline" 
          className="rounded-full px-8 py-6 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-[#DC143C] transition-colors uppercase font-bold tracking-widest mt-4"
        >
          Return Home
        </Button>
      </Link>
    </div>
  );
}