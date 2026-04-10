'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useGamificationStore, getLevelFromXp, getProgressToNextLevel } from '@/store/useGamificationStore';
import { useTranslation } from 'react-i18next';

// ─── 3D Cyber Cat Component (شخصية القطة فقط وبشكل متناسق) ───────────

function CyberCat({ color = '#ffffff' }) { // White fur default
  const earRefL = useRef<THREE.Group>(null!);
  const earRefR = useRef<THREE.Group>(null!);
  const tailRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();

    // حركة الأذن (Twitching)
    if (Math.sin(t * 2) > 0.95 && earRefL.current) {
      earRefL.current.rotation.z = Math.sin(t * 20) * 0.1;
      earRefR.current.rotation.z = -Math.sin(t * 20) * 0.1;
    } else if (earRefL.current) {
      earRefL.current.rotation.z = 0;
      earRefR.current.rotation.z = 0;
    }

    // حركة الذيل
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 3.5) * 0.4;
      tailRef.current.rotation.z = Math.cos(t * 3.5) * 0.15;
    }

    // التنفس (تمدد وانكماش خفيف للجسم)
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + Math.sin(t * 2.5) * 0.04;
      bodyRef.current.scale.x = 1 + Math.sin(t * 2.5 + Math.PI) * 0.02;
    }

    // الرأس يتبع حركة الماوس قليلاً ليكون تفاعلي
    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, (pointer.x * Math.PI) / 6, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, (-pointer.y * Math.PI) / 8, 0.1);
    }
  });

  return (
    <group position={[0, -0.35, 0]} scale={1.4}> {/* تكبير القطة لتناسب المربع */}

      {/* الجسم الأساسي */}
      <mesh ref={bodyRef} position={[0, 0.3, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.45, 64, 64]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* بقعة برتقالية على الجسم */}
      <mesh position={[0.25, 0.3, 0.25]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#f97316" roughness={0.8} />
      </mesh>

      {/* حزام إلكتروني حول الجسم (Cyber Harness) */}
      <mesh position={[0, 0.3, 0.1]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.46, 0.02, 16, 64]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.8} />
      </mesh>

      {/* الأقدام الأمامية */}
      <mesh position={[-0.2, 0.05, 0.35]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.2, 0.05, 0.35]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* مجموعة الرأس */}
      <group ref={headRef} position={[0, 0.85, 0.1]}>
        {/* كرة الرأس */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.4, 64, 64]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>

        {/* بقعة برتقالية على الرأس (يمين) */}
        <mesh position={[0.2, 0.2, 0.2]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color="#f97316" roughness={0.8} />
        </mesh>

        {/* الأذنين */}
        <group ref={earRefL} position={[-0.25, 0.3, 0]} rotation={[0, 0, 0.2]}>
          <mesh castShadow>
            <coneGeometry args={[0.15, 0.3, 32]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* لون الأذن من الداخل */}
          <mesh position={[0, 0.02, 0.06]} rotation={[0.1, 0, 0]}>
            <coneGeometry args={[0.1, 0.25, 32]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>

        <group ref={earRefR} position={[0.25, 0.3, 0]} rotation={[0, 0, -0.2]}>
          <mesh castShadow>
            <coneGeometry args={[0.15, 0.3, 32]} />
            <meshStandardMaterial color="#f97316" roughness={0.8} /> {/* أذن برتقالية لتطابق البقعة */}
          </mesh>
          {/* لون الأذن من الداخل */}
          <mesh position={[0, 0.02, 0.06]} rotation={[0.1, 0, 0]}>
            <coneGeometry args={[0.1, 0.25, 32]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>

        {/* عيون نيون متقنة لتجنب الحول (Spheres بدلاً من Cylinders المسطحة) */}
        <mesh position={[-0.14, 0.05, 0.36]}>
          <sphereGeometry args={[0.08, 32, 32]} />
          <meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[0.14, 0.05, 0.36]}>
          <sphereGeometry args={[0.08, 32, 32]} />
          <meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={1.5} />
        </mesh>

        {/* الأنف */}
        <mesh position={[0, -0.05, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.05, 32]} />
          <meshStandardMaterial color="#333333" />
        </mesh>

        {/* الطوق الإلكتروني حول الرقبة */}
        <mesh position={[0, -0.35, 0]} rotation={[Math.PI / 2 + 0.1, 0, 0]}>
          <torusGeometry args={[0.3, 0.03, 16, 64]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* مجموعة الذيل */}
      <group position={[0, 0.15, -0.4]} ref={tailRef}>
        <mesh position={[0, 0.2, -0.1]} rotation={[-0.2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.4, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>

    </group>
  );
}

// ─── Main Scene Controller ───────────────────────────────────────────────────

function PetScene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <Environment preset="city" />

      {/* تأثير الطفو الشرارات المضيئة */}
      <Float speed={2.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <Sparkles count={30} scale={4} size={2.5} speed={0.4} opacity={0.6} color="#39ff14" />
        <group rotation={[0, -0.2, 0]}>
          {/* عرض شخصية القطة فقط */}
          <CyberCat />
        </group>
      </Float>

      {/* الظل الناعم أسفل القطة */}
      <ContactShadows position={[0, -0.6, 0]} opacity={0.6} scale={5} blur={2.5} far={4} />
    </>
  );
}

// ─── UI Container ────────────────────────────────────────────────────────────

export function PetCompanion() {
  const { t } = useTranslation('common');
  const { activePetName, totalXp } = useGamificationStore(); // حذفنا activePetType لأننا نستخدم القطة فقط

  const currentLvl = getLevelFromXp(totalXp);
  const { currentLevelXp, nextLevelXp, progressPercent } = useMemo(() => getProgressToNextLevel(totalXp), [totalXp]);

  return (
    <div className="w-full flex justify-center py-4">
      {/* إطار السايبر: إطار بحدود نيون مشعة */}
      <div className="relative w-full max-w-[320px] aspect-square bg-card/40 backdrop-blur-3xl rounded-[2.5rem] border-2 border-cyan-400/50 shadow-[0_0_20px_rgba(0,229,255,0.3)] min-[100px]:animate-[pulse_4s_ease-in-out_infinite] overflow-hidden flex flex-col items-center">

        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-background -z-10" />

        {/* 3D Canvas */}
        <div className="w-full flex-1 min-h-[220px]">
          <Canvas shadows camera={{ position: [0, 1.5, 5], fov: 45 }}>
            <PetScene />
          </Canvas>
        </div>

        {/* Pet Stats UI Bar */}
        <div className="w-full bg-card/80 backdrop-blur-lg border-t border-white/10 p-5 z-10 flex flex-col gap-2 rounded-b-[2.5rem]">
          <div className="flex justify-between items-end w-full px-1">
            <div>
              <h3 className="font-bold text-foreground text-lg leading-tight">{activePetName || 'Luna'}</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {t('gami.level', { defaultValue: 'Level' })} {currentLvl}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-mono">
                {totalXp - currentLevelXp} / {nextLevelXp - currentLevelXp} XP
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner flex relative">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
            {progressPercent >= 99 && (
              <div className="absolute top-0 left-0 w-full h-full animate-pulse bg-white/40" />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}