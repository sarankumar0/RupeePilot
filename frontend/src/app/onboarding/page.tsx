import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import OnboardingFlow from './OnboardingFlow';

const API = process.env.NEXT_PUBLIC_API_URL;

async function getUserProfile(googleId: string) {
  try {
    const res = await fetch(`${API}/users/${googleId}`, { cache: 'no-store' });
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const googleId = (session.user as any).googleId as string;
  const userProfile = await getUserProfile(googleId);

  // If already onboarded, go straight to dashboard
  if (userProfile?.onboardingDone) redirect('/dashboard');

  return (
    <OnboardingFlow
      googleId={googleId}
      name={session.user?.name?.split(' ')[0] ?? 'there'}
    />
  );
}
