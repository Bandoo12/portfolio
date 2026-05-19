import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import SiteHeader from '@/components/SiteHeader';
import RevealText from '@/components/RevealText';
import CaseButton from '@/components/CaseButton';
import HeadScrollButton from '@/components/HeadScrollButton';
import ScrollToSection from '@/components/ScrollToSection';

/* ─── data ─────────────────────────────────────────────────── */

const features = [
  { label: 'product designer' },
  { label: '15 лет опыта' },
  { label: 'работа в бигтех' },
];

const steps = [
  { num: '01', title: 'Исследование', sub: 'Контекст, задачи, риски' },
  { num: '02', title: 'Сценарии', sub: 'Карта флоу, роли, данные' },
  { num: '03', title: 'Прототип', sub: 'Интерактив, гипотезы, выводы' },
  { num: '04', title: 'Интерфейс', sub: 'UI, компоненты, адаптивность' },
  { num: '05', title: 'Запуск и метрики', sub: 'Релиз, аналитика, итерации' },
];

const experience = [
  { year: '2026', project: 'Еврохим. Цифровые технологии\nи платформы', text: 'Разработал и запустил 12 продуктов экосистемы Omnia (web, app). Создал дизайн-систему. Провёл более 90 тестов и интервью' },
  { year: '2023', project: 'РСХБ. Единая рабочая\nпанель Свой Бизнес', text: 'Лидировал и менторил команду из 8 дизайнеров. Разрабатывал ключевые продукты (web, app) и поддерживал дизайн-систему' },
  { year: '2022', project: 'СберЗвук. Стримминговый\nсервис', text: 'Был частью команды и отвечал за направление\nпродукта в мобильном приложении. Проводил интервью, тестирования, собирал качественные wireframe' },
  { year: '2020', project: 'KDV Group. Онлайн-магазин', text: 'Разработал и запустил 12 продуктов экосистемы Omnia. Создал единую дизайн-систему и визуальный язык. Провёл более 90 тестов и 40 интервью' },
  { year: '2019', project: 'NoOne. Онлайн-магазин', text: 'Разработал и запустил 12 продуктов экосистемы Omnia. Создал единую дизайн-систему и визуальный язык. Провёл более 90 тестов и 40 интервью' },
];

/* ─── helpers ───────────────────────────────────────────────── */

function FeatureIconSVG({ size = 20, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="23 23 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M37.512 29.488L37.512 37.512L29.488 37.512L29.488 29.488L37.512 29.488ZM31.409 35.5961L35.5905 35.5961L35.5905 31.4034L31.409 31.4034L31.409 35.5961Z" fill="white"/>
      <path d="M41.6083 39.5238C41.6083 38.7088 41.599 38.5024 41.5581 38.3601C41.4346 37.9306 41.0977 37.5946 40.6669 37.4715C40.5241 37.4307 40.3188 37.4214 39.5059 37.4214L37.427 37.4214L37.427 39.53C37.427 40.3281 37.4366 40.5298 37.4763 40.6701C37.599 41.1039 37.9387 41.443 38.3737 41.5654C38.5144 41.605 38.7168 41.614 39.5177 41.614C40.3186 41.614 40.521 41.605 40.6617 41.5654C41.0967 41.443 41.4369 41.1039 41.5596 40.6701C41.5993 40.5299 41.6083 40.3263 41.6083 39.5238ZM43.5298 39.5238C43.5298 40.1961 43.5388 40.7308 43.4088 41.1906C43.1045 42.2658 42.2616 43.1058 41.1832 43.4091C40.7222 43.5388 40.1885 43.5298 39.5177 43.5298C38.8469 43.5298 38.3132 43.5388 37.8521 43.4091C36.7739 43.1058 35.9308 42.2658 35.6266 41.1906C35.4966 40.731 35.5061 40.1987 35.5061 39.53L35.5061 35.5061L39.5059 35.5061C40.1867 35.5061 40.7286 35.4968 41.1961 35.6304C42.264 35.9355 43.0991 36.7677 43.4052 37.8325C43.5392 38.2987 43.5298 38.8415 43.5298 39.5238Z" fill="white"/>
      <path d="M25.3916 39.5238C25.3916 38.7088 25.401 38.5024 25.4419 38.3601C25.5654 37.9306 25.9023 37.5946 26.3331 37.4715C26.4758 37.4307 26.6811 37.4214 27.4941 37.4214L29.5729 37.4214L29.5729 39.53C29.5729 40.3281 29.5634 40.5298 29.5237 40.6701C29.401 41.1039 29.0613 41.443 28.6263 41.5654C28.4856 41.605 28.2831 41.614 27.4823 41.614C26.6814 41.614 26.479 41.605 26.3382 41.5654C25.9032 41.443 25.563 41.1039 25.4403 40.6701C25.4007 40.5299 25.3916 40.3263 25.3916 39.5238ZM23.4702 39.5238C23.4702 40.1961 23.4611 40.7308 23.5912 41.1906C23.8954 42.2658 24.7384 43.1058 25.8167 43.4091C26.2778 43.5388 26.8115 43.5298 27.4823 43.5298C28.153 43.5298 28.6868 43.5388 29.1478 43.4091C30.2261 43.1058 31.0691 42.2658 31.3733 41.1906C31.5034 40.731 31.4938 40.1987 31.4938 39.53L31.4938 35.5061L27.4941 35.5061C26.8132 35.5061 26.2714 35.4968 25.8039 35.6304C24.7359 35.9355 23.9009 36.7677 23.5948 37.8325C23.4608 38.2987 23.4702 38.8415 23.4702 39.5238Z" fill="white"/>
      <path d="M41.6084 27.4761C41.6084 28.2912 41.599 28.4976 41.5581 28.6398C41.4346 29.0694 41.0977 29.4054 40.6669 29.5285C40.5242 29.5692 40.3189 29.5786 39.5059 29.5786L37.4271 29.5786L37.4271 27.47C37.4271 26.6718 37.4366 26.4702 37.4763 26.3298C37.599 25.8961 37.9387 25.557 38.3737 25.4346C38.5144 25.395 38.7169 25.386 39.5177 25.386C40.3186 25.386 40.521 25.395 40.6618 25.4346C41.0968 25.5569 41.437 25.8961 41.5597 26.3298C41.5993 26.4701 41.6084 26.6736 41.6084 27.4761ZM43.5298 27.4761C43.5298 26.8038 43.5389 26.2691 43.4088 25.8093C43.1046 24.7342 42.2616 23.8941 41.1833 23.5908C40.7222 23.4612 40.1885 23.4702 39.5177 23.4702C38.847 23.4702 38.3132 23.4612 37.8522 23.5908C36.7739 23.8942 35.9309 24.7342 35.6267 25.8093C35.4966 26.269 35.5062 26.8012 35.5062 27.47L35.5062 31.4939L39.5059 31.4939C40.1868 31.4939 40.7286 31.5032 41.1961 31.3696C42.2641 31.0645 43.0991 30.2323 43.4052 29.1675C43.5392 28.7012 43.5298 28.1585 43.5298 27.4761Z" fill="white"/>
      <path d="M25.3917 27.4761C25.3917 28.2912 25.401 28.4976 25.4419 28.6398C25.5654 29.0694 25.9023 29.4054 26.3331 29.5285C26.4759 29.5692 26.6812 29.5786 27.4941 29.5786L29.573 29.5786L29.573 27.47C29.573 26.6718 29.5634 26.4702 29.5237 26.3298C29.401 25.8961 29.0613 25.557 28.6263 25.4346C28.4856 25.395 28.2832 25.386 27.4823 25.386C26.6814 25.386 26.479 25.395 26.3383 25.4346C25.9033 25.5569 25.5631 25.8961 25.4404 26.3298C25.4007 26.4701 25.3917 26.6736 25.3917 27.4761ZM23.4702 27.4761C23.4702 26.8038 23.4612 26.2691 23.5912 25.8093C23.8955 24.7342 24.7384 23.8941 25.8168 23.5908C26.2778 23.4612 26.8115 23.4702 27.4823 23.4702C28.1531 23.4702 28.6868 23.4612 29.1479 23.5908C30.2261 23.8942 31.0692 24.7342 31.3734 25.8093C31.5034 26.269 31.4939 26.8012 31.4939 27.47L31.4939 31.4939L27.4941 31.4939C26.8133 31.4939 26.2714 31.5032 25.8039 31.3696C24.736 31.0645 23.9009 30.2323 23.5948 29.1675C23.4608 28.7012 23.4702 28.1585 23.4702 27.4761Z" fill="white"/>
    </svg>
  );
}

function IconLibrary({ fill = 'black' }: { fill?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M4.96268 8.64487C4.44873 8.64487 4.03209 9.06151 4.03209 9.57546V12.9687C4.03209 13.4827 4.44873 13.8993 4.96268 13.8993H6.84468C7.35863 13.8993 7.77527 13.4827 7.77527 12.9687V9.57546C7.77527 9.06151 7.35863 8.64487 6.84468 8.64487H4.96268ZM6.0151 9.82532C6.21996 10.4575 6.71902 10.9564 7.35006 11.1604C7.39865 11.1763 7.43156 11.2214 7.43156 11.2724C7.43156 11.3233 7.39865 11.3684 7.35006 11.3843C6.71902 11.5882 6.21981 12.0872 6.0151 12.7192C5.99943 12.7677 5.95429 12.8006 5.90335 12.8006C5.85225 12.8006 5.80711 12.7677 5.79143 12.7192C5.58673 12.0872 5.08751 11.5882 4.45648 11.3843C4.40789 11.3684 4.37513 11.3233 4.37513 11.2724C4.37513 11.2214 4.40789 11.1763 4.45648 11.1604C5.08751 10.9564 5.58657 10.4575 5.79143 9.82532C5.80711 9.77705 5.85225 9.74413 5.90335 9.74413C5.95429 9.74413 5.99943 9.77705 6.0151 9.82532Z" fill={fill}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M9.57057 8.64552C9.05661 8.64552 8.63997 9.06216 8.63997 9.57611V12.9694C8.63997 13.4833 9.05661 13.9 9.57057 13.9H11.4526C11.9665 13.9 12.3832 13.4833 12.3832 12.9694V9.57611C12.3832 9.06216 11.9665 8.64552 11.4526 8.64552H9.57057ZM10.6209 9.82532C10.8257 10.4575 11.3248 10.9564 11.9558 11.1604C12.0044 11.1763 12.0373 11.2214 12.0373 11.2724C12.0373 11.3233 12.0044 11.3684 11.9558 11.3843C11.3248 11.5882 10.8256 12.0872 10.6209 12.7192C10.6052 12.7677 10.56 12.8006 10.5091 12.8006C10.458 12.8006 10.4129 12.7677 10.3972 12.7192C10.1925 12.0872 9.69326 11.5882 9.06223 11.3843C9.01364 11.3684 8.98088 11.3233 8.98088 11.2724C8.98088 11.2214 9.01364 11.1763 9.06223 11.1604C9.69326 10.9564 10.1923 10.4575 10.3972 9.82532C10.4129 9.77705 10.458 9.74413 10.5091 9.74413C10.56 9.74413 10.6052 9.77705 10.6209 9.82532Z" fill={fill}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M14.0762 8.64552C13.5623 8.64552 13.1457 9.06216 13.1457 9.57611V12.9694C13.1457 13.4833 13.5623 13.9 14.0762 13.9H15.9582C16.4722 13.9 16.8888 13.4833 16.8888 12.9694V9.57611C16.8888 9.06216 16.4722 8.64552 15.9582 8.64552H14.0762ZM15.129 9.82532C15.3338 10.4575 15.8329 10.9564 16.4639 11.1604C16.5125 11.1763 16.5454 11.2214 16.5454 11.2724C16.5454 11.3233 16.5125 11.3684 16.4639 11.3843C15.8329 11.5882 15.3337 12.0872 15.129 12.7192C15.1133 12.7677 15.0681 12.8006 15.0172 12.8006C14.9661 12.8006 14.921 12.7677 14.9053 12.7192C14.7006 12.0872 14.2014 11.5882 13.5703 11.3843C13.5217 11.3684 13.489 11.3233 13.489 11.2724C13.489 11.2214 13.5217 11.1763 13.5703 11.1604C14.2014 10.9564 14.7004 10.4575 14.9053 9.82532C14.921 9.77705 14.9661 9.74413 15.0172 9.74413C15.0681 9.74413 15.1133 9.77705 15.129 9.82532Z" fill={fill}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M21.6287 7.10876V10.2378C21.6287 10.4274 21.4864 10.5697 21.2968 10.5697H20.7515V10.0481C20.7515 9.4791 20.301 9.02863 19.732 9.02863H19.5186V6.51551C19.5186 5.42491 18.6414 4.52398 17.5271 4.52398H15.3933C14.4924 2.91179 12.6431 1.79749 10.5093 1.79749C8.37552 1.79749 6.52624 2.91179 5.62531 4.52398H3.49153C2.40093 4.52398 1.5 5.4012 1.5 6.51551V16.0464C1.5 17.137 2.37722 18.0379 3.49153 18.0379H4.4333L3.80266 19.7095C3.58058 20.2982 4.01559 20.9272 4.64474 20.9272H16.3796C17.0088 20.9272 17.4438 20.2981 17.2217 19.7095L16.5909 18.0379H17.5508C18.6414 18.0379 19.5423 17.1607 19.5423 16.0464V13.5096H19.7557C20.3247 13.5096 20.7752 13.0591 20.7752 12.4901V11.9685H21.273C22.2451 11.9685 23.0038 11.1861 23.0038 10.2378V7.08827C23.5917 6.81865 24 6.22492 24 5.53581C24 4.59305 23.2357 3.82879 22.293 3.82879C21.3502 3.82879 20.5859 4.59305 20.5859 5.53581C20.5859 6.24294 21.0159 6.84965 21.6287 7.10876ZM2.82391 15.8109H4.93464V15.8182H16.5076C16.5609 15.8182 16.6135 15.8158 16.6655 15.8109H16.9961C17.6502 15.8109 18.1803 15.2807 18.1803 14.6267V14.3552C18.1901 14.2818 18.1952 14.2068 18.1952 14.1307V8.42386C18.1952 8.34773 18.1901 8.27277 18.1803 8.19931V7.91051C18.1803 7.25648 17.6502 6.72629 16.9961 6.72629H4.00813C3.3541 6.72629 2.82391 7.25648 2.82391 7.91051V15.8109Z" fill={fill}/>
    </svg>
  );
}

function IconGroup() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="8" height="8" rx="1.5" fill="white"/>
      <rect x="12" y="0" width="8" height="8" rx="1.5" fill="white"/>
      <rect x="6" y="6" width="8" height="8" rx="1.5" fill="white"/>
      <rect x="0" y="12" width="8" height="8" rx="1.5" fill="white"/>
      <rect x="12" y="12" width="8" height="8" rx="1.5" fill="white"/>
    </svg>
  );
}

function GridIcon({ dark = false }: { dark?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke={dark ? '#000' : '#555'} strokeWidth="1.2"/>
      <rect x="9" y="1" width="6" height="6" rx="1" stroke={dark ? '#000' : '#555'} strokeWidth="1.2"/>
      <rect x="1" y="9" width="6" height="6" rx="1" stroke={dark ? '#000' : '#555'} strokeWidth="1.2"/>
      <rect x="9" y="9" width="6" height="6" rx="1" stroke={dark ? '#000' : '#555'} strokeWidth="1.2"/>
    </svg>
  );
}

/* ─── page ──────────────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="snap-container">
      <ScrollToSection />

      {/* ── 1. Hero ─────────────────────────────────────── */}
      <section
        className="snap-section relative flex flex-col"
        style={{ background: '#030303' }}
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/hero-bg-solo.png"
            alt=""
            fetchPriority="high"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <SiteHeader />

          {/* Feature List — vertically and horizontally centered */}
          <div className="flex-1 flex items-center">
            <div className="mx-auto max-w-[1512px] px-[44px] w-full flex gap-[177px] justify-center">
              {features.map((f) => (
                <div key={f.label} className="flex flex-col gap-10 items-center">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: '88px', height: '88px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 63, 0, 0.2)',
                    }}
                  >
                    <FeatureIconSVG style={{ filter: 'drop-shadow(0 0 23.4px rgba(255,255,255,0.75))' }} />
                  </div>
                  <span
                    className="font-normal"
                    style={{
                      fontSize: '24px',
                      background: 'linear-gradient(173deg, #ffffff 0%, #4d1c00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero name + Head Text Button */}
          <div className="px-[44px] mb-[44px]">
            <h1
              className="font-normal text-white leading-none tracking-tight"
              style={{ fontSize: 'clamp(32px, 12.5vw, 100vw)' }}
            >
              <RevealText>Kovalchuk Anton</RevealText>
            </h1>
            <div className="mt-5">
              <HeadScrollButton>
                <div
                  style={{
                    width: '88px', height: '88px', borderRadius: '50%',
                    border: '1px solid rgba(177,93,65,1)',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Image src="/img/btn-icon-head.png" alt="" width={36} height={36} />
                </div>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-line', maxWidth: '123px' }}>
                  {'пойдем дальше —\nтам интереснее'}
                </span>
              </HeadScrollButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 1: Eurochem ─────────────────────────── */}
      <section
        id="section-1"
        className="snap-section relative overflow-hidden flex flex-col"
        style={{ background: 'radial-gradient(ellipse at 48% 28%, #ffffff 0%, #987f7f 100%)' }}
      >
        {/* Image 1 — lower portion */}
        <div
          className="absolute overflow-hidden"
          style={{ left: '-15px', top: '27.3%', width: 'calc(100% + 15px)', height: '72.7%' }}
        >
          <Image
            src="/img/eurochem-bg.png"
            alt="Eurochem"
            fill
            style={{ objectFit: 'cover', objectPosition: 'top left' }}
            sizes="110vw"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full mx-auto max-w-[1512px] w-full px-11 py-11">
          {/* Project Header — items aligned to bottom edge */}
          <div className="flex items-end w-full">
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '68px', fontWeight: 400, color: '#000', lineHeight: 1.06 }}>
                <RevealText>Еврохим:</RevealText>
                <br />
                <span style={{ opacity: 0.5 }}><RevealText delay={0.12}>Цифровой офис</RevealText></span>
              </h2>
            </div>
            <p style={{ fontSize: '18px', fontWeight: 400, color: '#000', opacity: 0.5, maxWidth: '280px', textAlign: 'left' }}>
              Доступ к библиотеке игр и in-house решениям
            </p>
          </div>

          {/* Project Button Group — Section 1 */}
          <div className="mt-auto flex gap-4">
            {[
              { icon: 's1-icon-1.png', label: 'Дизайн система' },
              { icon: 's1-icon-2.png', label: 'Дашборды и виджеты' },
              { icon: 's1-icon-3.png', label: '3D-схемы' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center flex-1"
                style={{ height: '64px', padding: '0 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
              >
                <Image src={`/img/${item.icon}`} alt="" width={48} height={48} style={{ borderRadius: '16px', flexShrink: 0 }} />
                <span style={{ fontSize: '20px', fontWeight: 400, color: '#fff', marginLeft: '12px' }}>{item.label}</span>
              </div>
            ))}
            <CaseButton href="/cases/eurochem" />
          </div>
        </div>
      </section>

      {/* ── Section 2: HR-CRM ───────────────────────────── */}
      <section
        id="section-2"
        className="snap-section relative overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(180deg, #121218 0%, #070809 8%, #18261b 41%, #243d27 53%, #335937 71%, #63B168 100%)' }}
      >
        {/* Section Image — right side */}
        <div
          className="absolute"
          style={{ left: '312px', top: '20%', width: '1288px', height: '80%', maxWidth: 'none' }}
        >
          <Image
            src="/img/home-hrcrm-img.png"
            alt="HR-CRM"
            fill
            style={{ objectFit: 'cover', objectPosition: 'top left' }}
            sizes="80vw"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full mx-auto max-w-[1512px] w-full px-11 py-11">
          {/* Project Header */}
          <div className="flex items-end w-full">
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '68px', fontWeight: 400, lineHeight: 1.06 }}>
                <span style={{ color: '#fff' }}><RevealText>HR-CRM:</RevealText></span>
                <br />
                <span style={{ color: 'rgba(255,255,255,0.5)' }}><RevealText delay={0.1}>Подбор персонала</RevealText></span>
              </h2>
            </div>
          </div>

          {/* Feature List — Section 2 */}
          <div className="flex-1 flex items-center">
            <div className="flex flex-col gap-6">
              {[
                { icon: 's2-icon-1.png', label: 'Исследование' },
                { icon: 's2-icon-2.png', label: 'Проектирование' },
                { icon: 's2-icon-3.png', label: 'Тестирование' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center"
                  style={{
                    width: '350px', height: '64px', padding: '0 8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Image src={`/img/${item.icon}`} alt="" width={48} height={48} style={{ borderRadius: '16px', flexShrink: 0 }} />
                  <span style={{ fontSize: '20px', fontWeight: 400, color: '#fff', marginLeft: '12px' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Button Group — full width, auto gap */}
          <div className="flex items-center w-full">
            <p style={{ fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.7)', maxWidth: '363px', whiteSpace: 'pre-line' }}>
              {'Единая воронка + быстрые\nсогласования + прозрачные статусы'}
            </p>
            <div style={{ flex: 1 }} />
            <CaseButton href="/cases/hr-crm" />
          </div>
        </div>
      </section>

      {/* ── Section 3: Rosselkhozbank ───────────────────── */}
      <section
        id="section-3"
        className="snap-section relative overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(180deg, #070709 0%, #424242 100%)' }}
      >
        <div className="absolute inset-0" style={{ left: '-102px', top: '4%', width: '113%', height: '96%', maxWidth: 'none' }}>
          <Image
            src="/img/home-rsb-img.png"
            alt="Свой Бизнес"
            fill
            style={{ objectFit: 'cover', objectPosition: 'top left' }}
            sizes="110vw"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full mx-auto max-w-[1512px] w-full px-11 py-11">
          {/* Project Header */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '68px', fontWeight: 400, lineHeight: 1.06 }}>
              <span style={{ color: '#fff' }}><RevealText>Россельхозбанк:</RevealText></span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.5)' }}><RevealText delay={0.1}>Свой Бизнес</RevealText></span>
            </h2>
            <p style={{ fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.7)', marginTop: '24px', maxWidth: '360px', textAlign: 'left' }}>
              Единое рабочее место для расчётов и управленческой аналитики
            </p>
          </div>

          {/* Project Button Group — Section 3 */}
          <div className="flex gap-4">
            {[
              { icon: 's3-icon-1.png', label: 'ДБО' },
              { icon: 's3-icon-2.png', label: 'Банковская аналитика' },
              { icon: 's3-icon-3.png', label: 'Вклады' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center flex-1"
                style={{ height: '64px', padding: '0 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
              >
                <Image src={`/img/${item.icon}`} alt="" width={48} height={48} style={{ borderRadius: '16px', flexShrink: 0 }} />
                <span style={{ fontSize: '20px', fontWeight: 400, color: '#fff', marginLeft: '12px' }}>{item.label}</span>
              </div>
            ))}
            <CaseButton href="/cases/rosselkhozbank" />
          </div>
        </div>
      </section>

      {/* ── Section 4: Process ──────────────────────────── */}
      <section
        className="snap-section relative overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(to top, #313131 0%, #1a1a1a 100%)' }}
      >
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none">
          <filter id="process-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="1" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#process-noise)" />
        </svg>

        <div
          className="absolute pointer-events-none"
          style={{
            left: '-217px', top: '647px',
            width: '2034px', height: '2033px',
            borderRadius: '50%',
            background: 'linear-gradient(180deg, rgba(172,172,172,0.5) 0%, rgba(225,172,163,0.5) 100%)',
            filter: 'blur(200px)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full mx-auto max-w-[1512px] w-full px-11 py-11">

          {/* Project Details — flex-1 */}
          <div className="flex flex-col justify-between flex-1">
            <h2 style={{ fontSize: '61px', fontWeight: 400, lineHeight: 1.06 }}>
              <span style={{ color: '#fff' }}><RevealText>{'От постановки задачи к результату.'}</RevealText></span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.5)' }}><RevealText delay={0.1}>5 этапов, которые экономят время</RevealText></span>
            </h2>
            <p style={{ fontSize: '18px', fontWeight: 500, color: '#fff', opacity: 0.65, whiteSpace: 'pre-line' }}>
              {'Артефакты: гипотезы, user-flows,\nпрототипы, DS, метрики'}
            </p>
          </div>

          {/* Steps Indicator */}
          <div className="flex" style={{ width: '868px', flexShrink: 0 }}>

            {/* Steps Group */}
            <div className="flex" style={{ width: '450px' }}>
              {/* Step numbers */}
              <div className="flex flex-col justify-between" style={{ width: '32px', flexShrink: 0 }}>
                {steps.map((s) => (
                  <span key={s.num} style={{ fontSize: '20px', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>{s.num}</span>
                ))}
              </div>

              {/* Dashed vertical separator */}
              <div style={{ width: 0, borderLeft: '1px dashed rgba(255,255,255,0.2)', alignSelf: 'stretch', flexShrink: 0, margin: '0 20px' }} />

              {/* Steps Content with PNG ellipses */}
              <div className="flex flex-col justify-between flex-1">
                {steps.map((s, i) => (
                  <div key={s.num} className="flex items-center gap-4">
                    <Image
                      src={`/img/step-el-${i}.png`}
                      alt=""
                      width={83}
                      height={83}
                      style={{ flexShrink: 0 }}
                    />
                    <div>
                      <p style={{ fontSize: '28px', fontWeight: 400, color: '#fff', lineHeight: 1 }}>{s.title}</p>
                      <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashed vertical separator */}
            <div style={{ width: 0, borderLeft: '1px dashed rgba(255,255,255,0.2)', alignSelf: 'stretch', flexShrink: 0, margin: '0 57px' }} />

            {/* Indicators */}
            <div className="flex flex-col justify-between" style={{ width: '304px', flexShrink: 0 }}>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8l5 5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: '28px', fontWeight: 400, color: '#fff' }}>Риски</span>
                  </div>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                    Минимизируем неопределённость на старте продукта/задачи
                  </p>
                </div>
                <Image
                  src="/img/risks-ellipses.png"
                  alt=""
                  width={319}
                  height={109}
                />
              </div>

              <div style={{ height: 0, borderTop: '1px dashed rgba(255,255,255,0.2)' }} />

              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 13V3M3 8l5-5 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: '28px', fontWeight: 400, color: '#fff' }}>Скорость</span>
                  </div>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                    Ускоряем согласование и релиз
                  </p>
                </div>
                <Image
                  src="/img/speed-ellipses.png"
                  alt=""
                  width={299}
                  height={89}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Experience ───────────────────────── */}
      <section
        className="snap-section relative flex flex-col"
        style={{ background: '#060608' }}
      >
        <div className="mx-auto max-w-[1512px] w-full px-11 pt-11 flex flex-col h-full overflow-hidden">
          <h2 style={{ fontSize: '68px', fontWeight: 400, color: '#fff', flexShrink: 0 }}>
            <RevealText>Мой опыт</RevealText>
          </h2>

          <div className="flex gap-11 mt-8 overflow-hidden flex-1">
            {/* Years column */}
            <div className="flex-shrink-0 relative" style={{ width: '57px', height: '100%' }}>
              {experience.map((e, i) => {
                const cardH = 155, gap = 8;
                const isBetween = i > 0 && i < 4;
                const top = isBetween
                  ? (i - 1) * (cardH + gap) + cardH + gap / 2
                  : i === 0 ? 0 : 4 * (cardH + gap);
                return (
                  <span
                    key={i}
                    style={{
                      position: 'absolute',
                      top,
                      left: 0,
                      transform: isBetween ? 'translateY(-50%)' : 'none',
                      fontSize: '24px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {e.year}
                  </span>
                );
              })}
            </div>

            {/* Entry rows */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {experience.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center"
                  style={{
                    height: '155px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '32px',
                    padding: '0 44px',
                    marginBottom: i < experience.length - 1 ? '8px' : 0,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ width: '672px', flexShrink: 0 }}>
                    {e.project && (
                      <p style={{ fontSize: '18px', fontWeight: 400, color: '#fff', whiteSpace: 'pre-line', lineHeight: 1.3 }}>
                        {e.project}
                      </p>
                    )}
                  </div>
                  <div style={{ flex: 1 }} />
                  <p style={{ fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.5)', maxWidth: '516px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {e.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex-shrink-0 flex items-center justify-center mt-auto"
            style={{ height: '96px', borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-4">
              <p style={{ fontSize: '18px', fontWeight: 500, color: '#fff' }}>
                И ещё 15 лет опыта позади в больших продуктах...
              </p>
              <a
                href="https://hh.ru/resume/84f20778ff0ce7d1af0039ed1f666638514f58?from=share_ios"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '16px', fontWeight: 400, color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}
              >
                Смотреть резюме на HH
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
