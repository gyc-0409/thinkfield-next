'use client';

import { use } from 'react';
import ProfileClient from '@/components/ProfileClient';

export default function UserProfilePage({ params }) {
  const { username } = use(params);
  const decoded = decodeURIComponent(username || '');
  return <ProfileClient username={decoded} />;
}
