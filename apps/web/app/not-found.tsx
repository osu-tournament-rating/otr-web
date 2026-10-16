import { Compass } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

import { StatusPage } from '@/components/kit/feedback/StatusPage';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <StatusPage
      icon={Compass}
      title="Page not found"
      description="Sorry, we don't have that page!"
      background={
        <Image
          src="/images/error-background.svg"
          alt=""
          fill
          sizes="100vw"
          // The art is empty in the middle. Always show all of it: cropped,
          // the outer shapes end in a hard edge at the column's sides. On
          // phones it sits at the top, so the shapes flank the icon and stay
          // off the text.
          className="object-contain object-top sm:object-center"
        />
      }
    />
  );
}
