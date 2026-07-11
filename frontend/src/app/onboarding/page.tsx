import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import OnboardingFlow from './OnboardingFlow';

const API = process.env.NEXT_PUBLIC_API_URL;

async function getUserProfile(token: string) {
  try {
    const res = await fetch(`${API}/users/me`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const token = (session as any).backendToken as string;
  const userProfile = await getUserProfile(token);

  // If already onboarded, go straight to dashboard
  if (userProfile?.onboardingDone) redirect('/dashboard');

  return (
    <OnboardingFlow
      token={token}
      name={session.user?.name?.split(' ')[0] ?? 'there'}
    />
  );
}
