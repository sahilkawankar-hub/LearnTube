import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { useAppStore, getAllCourses } from '../store/useAppStore';
import { PlacementTest } from '../components/PlacementTest';
import { PillButton } from '../components/PillButton';

export const PlacementTestPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { generatedCourses } = useAppStore();

  const allCourses = useMemo(
    () => getAllCourses(generatedCourses),
    [generatedCourses]
  );

  const course = useMemo(
    () => allCourses.find((c) => c.slug === slug),
    [allCourses, slug]
  );

  if (!course) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex items-center justify-center p-6">
        <div className="max-w-[520px] w-full bg-white rounded-[20px] border border-[#EAE8DF] p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#E2E8CE] text-[#435624] flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#181A16]">
            Course{' '}
            <span className="font-serif-accent text-[32px] font-normal">
              not found
            </span>
          </h1>
          <p className="text-[14px] text-[#6B6E65]">
            We couldn&apos;t find the course for this placement test.
          </p>
          <PillButton variant="olive" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to dashboard</span>
          </PillButton>
        </div>
      </div>
    );
  }

  return <PlacementTest course={course} />;
};
