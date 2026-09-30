'use client';

import LenisProvider from '@/components/LenisProvider';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const FONT = 'var(--font-manrope, Manrope, sans-serif)';

const NAV_LINKS = ['Клубы', 'О клубе', 'Зоны клуба', 'Тренера', 'Клубные карты'];

function LogoMark({ height = 19 }: { height?: number }) {
  const w = (135 / 20) * height;
  return (
    <svg width={w} height={height} viewBox="0 0 135 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M118.901 18.6462C118.291 18.6462 118.092 18.3667 118.304 17.8078L124.528 1.4607C124.79 0.774806 125.188 0.431859 125.722 0.431859H127.5C128.033 0.431859 128.431 0.774806 128.694 1.4607L134.918 17.8078C135.129 18.3667 134.93 18.6462 134.321 18.6462H132.301C131.742 18.6462 131.353 18.354 131.133 17.7697L129.837 14.353H123.385L122.089 17.7697C121.869 18.354 121.479 18.6462 120.92 18.6462H118.901ZM124.566 11.2029H128.656L127.093 7.16378C126.907 6.68959 126.793 6.34664 126.75 6.13494C126.717 5.91478 126.678 5.593 126.636 5.16961H126.585C126.543 5.593 126.501 5.91478 126.458 6.13494C126.424 6.34664 126.314 6.68959 126.128 7.16378L124.566 11.2029Z" fill="white"/>
      <path d="M101.944 18.6462C101.351 18.6462 101.055 18.3286 101.055 17.6935V1.38449C101.055 0.749403 101.351 0.431859 101.944 0.431859H106.377C110.272 0.431859 112.906 1.21937 114.278 2.79438C115.658 4.3694 116.348 6.60914 116.348 9.51361C116.348 12.4181 115.658 14.6663 114.278 16.2582C112.906 17.8502 110.272 18.6462 106.377 18.6462H101.944ZM104.764 15.4961H106.136C108.761 15.4961 110.459 15.0092 111.229 14.0354C112 13.0532 112.385 11.5459 112.385 9.51361C112.385 7.48133 112 5.98252 111.229 5.01719C110.459 4.04339 108.761 3.55649 106.136 3.55649H104.764V15.4961Z" fill="white"/>
      <path d="M82.777 18.6462C82.1674 18.6462 81.9684 18.3667 82.1801 17.8078L88.4039 1.4607C88.6664 0.774806 89.0644 0.431859 89.5979 0.431859H91.3761C91.9096 0.431859 92.3076 0.774806 92.5701 1.4607L98.7939 17.8078C99.0056 18.3667 98.8066 18.6462 98.197 18.6462H96.1774C95.6185 18.6462 95.229 18.354 95.0088 17.7697L93.7132 14.353H87.2608L85.9652 17.7697C85.745 18.354 85.3555 18.6462 84.7966 18.6462H82.777ZM88.442 11.2029H92.532L90.9697 7.16378C90.7834 6.68959 90.6691 6.34664 90.6267 6.13494C90.5928 5.91478 90.5547 5.593 90.5124 5.16961H90.4616C90.4193 5.593 90.3769 5.91478 90.3346 6.13494C90.3007 6.34664 90.1906 6.68959 90.0043 7.16378L88.442 11.2029Z" fill="white"/>
      <path d="M69.4785 18.6462C68.8858 18.6462 68.5894 18.3286 68.5894 17.6935V1.38449C68.5894 0.749403 68.8858 0.431859 69.4785 0.431859H71.5362C72.0443 0.431859 72.2983 0.749403 72.2983 1.38449V15.4961H79.7034C80.3385 15.4961 80.6561 15.7713 80.6561 16.3217V17.8205C80.6561 18.371 80.3385 18.6462 79.7034 18.6462H69.4785Z" fill="white"/>
      <path d="M50.3114 18.6462C49.7017 18.6462 49.5027 18.3667 49.7144 17.8078L55.9382 1.4607C56.2008 0.774806 56.5987 0.431859 57.1322 0.431859H58.9105C59.4439 0.431859 59.8419 0.774806 60.1044 1.4607L66.3283 17.8078C66.54 18.3667 66.341 18.6462 65.7313 18.6462H63.7117C63.1528 18.6462 62.7633 18.354 62.5432 17.7697L61.2476 14.353H54.7951L53.4995 17.7697C53.2794 18.354 52.8898 18.6462 52.331 18.6462H50.3114ZM55.9764 11.2029H60.0663L58.504 7.16378C58.3177 6.68959 58.2034 6.34664 58.1611 6.13494C58.1272 5.91478 58.0891 5.593 58.0467 5.16961H57.9959C57.9536 5.593 57.9113 5.91478 57.8689 6.13494C57.835 6.34664 57.725 6.68959 57.5387 7.16378L55.9764 11.2029Z" fill="white"/>
      <path d="M31.9322 9.53901C31.9322 6.61761 32.6731 4.29742 34.155 2.57845C35.6369 0.859485 37.775 0 40.5694 0C42.1783 0 43.5416 0.249801 44.6593 0.749403C45.7771 1.249 46.5646 1.973 47.0219 2.9214C47.3267 3.54802 47.2759 3.97141 46.8694 4.19158L45.3452 5.00449C44.8118 5.29239 44.3714 5.1315 44.0242 4.52182C43.8041 4.1323 43.3934 3.78089 42.7922 3.46758C42.1994 3.15427 41.5008 2.99761 40.6964 2.99761C38.9181 2.99761 37.6734 3.56072 36.9621 4.68694C36.2508 5.8047 35.8951 7.42205 35.8951 9.53901C35.8951 11.656 36.2508 13.2776 36.9621 14.4038C37.6734 15.5215 38.9181 16.0804 40.6964 16.0804C41.6533 16.0804 42.4577 15.8645 43.1097 15.4326C43.7702 15.0008 44.2275 14.5901 44.4815 14.2006C44.8964 13.5655 45.3368 13.4046 45.8025 13.7179L47.3267 14.734C47.7416 15.0135 47.784 15.4369 47.4537 16.0042C46.9626 16.851 46.12 17.575 44.9261 18.1762C43.7321 18.7774 42.2799 19.078 40.5694 19.078C37.8173 19.078 35.6877 18.2185 34.1804 16.4996C32.6816 14.7806 31.9322 12.4604 31.9322 9.53901Z" fill="white"/>
      <path d="M16.4748 17.2871C15.9498 16.8891 15.8227 16.4869 16.0937 16.0804L17.0717 14.607C17.3935 14.1243 17.8635 14.0989 18.4816 14.5308C18.9558 14.861 19.574 15.204 20.3361 15.5596C21.1067 15.9068 21.9153 16.0804 22.7621 16.0804C23.3549 16.0804 23.9265 16.0127 24.4769 15.8772C25.0273 15.7417 25.4464 15.4792 25.7343 15.0897C26.0222 14.7002 26.1662 14.2387 26.1662 13.7052C26.1662 13.3241 26.1027 12.9897 25.9757 12.7017C25.8487 12.4138 25.6412 12.1767 25.3533 11.9904C25.0654 11.8042 24.769 11.6475 24.4642 11.5205C23.9307 11.3003 23.2575 11.0844 22.4446 10.8727C21.6401 10.6525 20.8442 10.39 20.0567 10.0852C19.3538 9.81421 18.7103 9.44163 18.126 8.96743C17.5417 8.49323 17.0887 7.95976 16.7669 7.36701C16.4451 6.77426 16.2842 5.98252 16.2842 4.99179C16.2842 3.81476 16.6653 2.80709 17.4274 1.96877C18.1895 1.13046 19.0659 0.592748 20.0567 0.355649C21.0474 0.11855 22.0466 0 23.0543 0C24.0535 0 25.0823 0.152421 26.1408 0.457263C27.2077 0.762105 28.0122 1.14316 28.5541 1.60042C29.0876 2.04921 29.2188 2.45567 28.9479 2.81979L27.919 4.20428C27.5719 4.67848 27.1061 4.71658 26.5218 4.31859C26.1493 4.06456 25.637 3.78089 24.9849 3.46758C24.3414 3.15427 23.6682 2.99761 22.9654 2.99761C22.4658 2.99761 22.0043 3.03995 21.5809 3.12463C21.1659 3.20931 20.7976 3.41254 20.4758 3.73431C20.154 4.05609 19.9931 4.45408 19.9931 4.92828C19.9931 5.38554 20.1117 5.75812 20.3488 6.04603C20.5859 6.32547 20.8484 6.53716 21.1363 6.68112C21.4242 6.8166 21.7164 6.93092 22.0127 7.02406C22.9273 7.32044 23.7444 7.58294 24.4642 7.81157C25.1839 8.03174 25.8487 8.2773 26.4583 8.54827C27.3051 8.92933 27.9529 9.31038 28.4017 9.69143C28.8505 10.0725 29.2188 10.5933 29.5068 11.2537C29.8031 11.9142 29.9513 12.7017 29.9513 13.6163C29.9513 14.9711 29.5195 16.0931 28.6557 16.9822C27.792 17.8629 26.8309 18.4302 25.7724 18.6843C24.7224 18.9468 23.6978 19.078 22.6986 19.078C21.2252 19.078 20.027 18.9341 19.104 18.6462C18.181 18.3667 17.3046 17.9137 16.4748 17.2871Z" fill="white"/>
      <path d="M0.889122 18.6462C0.296374 18.6462 0 18.3286 0 17.6935V1.38449C0 0.749403 0.296374 0.431859 0.889122 0.431859H11.7872C12.4223 0.431859 12.7398 0.707064 12.7398 1.25747V2.75628C12.7398 3.30669 12.4223 3.58189 11.7872 3.58189H3.70891V7.62105H11.114C11.7491 7.62105 12.0667 7.89625 12.0667 8.44666V9.94547C12.0667 10.4959 11.7491 10.7711 11.114 10.7711H3.70891V15.4961H12.1937C12.8288 15.4961 13.1463 15.7713 13.1463 16.3217V17.8205C13.1463 18.371 12.8288 18.6462 12.1937 18.6462H0.889122Z" fill="white"/>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.5626 16.0009L10.9629 9.40124L12.8485 7.51562L21.3338 16.0009L12.8485 24.4861L10.9629 22.6005L17.5626 16.0009Z" fill="black"/>
    </svg>
  );
}

function CtaButton({ label }: { label: string }) {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: '#fff',
        border: '2px solid rgba(246,105,73,0.1)',
        borderRadius: '0px 24px 24px 24px',
        padding: '12px 20px 12px 32px',
        cursor: 'pointer',
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 18,
        lineHeight: '19.8px',
        color: '#000',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <ArrowIcon />
    </button>
  );
}

function Nav() {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '20px 40px 0',
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        <div style={{ width: 235, display: 'flex', alignItems: 'center' }}>
          <LogoMark />
        </div>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            height: 44,
            padding: '9px 24px 10px',
            borderRadius: 16,
            background: 'rgba(25,28,31,0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l}
              href="#"
              style={{
                fontFamily: FONT,
                fontWeight: 500,
                fontSize: 17,
                lineHeight: '22.95px',
                color: '#b6bfe1',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              {l}
            </a>
          ))}
        </nav>

        <div style={{ width: 235, display: 'flex', justifyContent: 'flex-end' }}>
          <a
            href="tel:+74951910313"
            style={{
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 17,
              lineHeight: '22.95px',
              color: '#fff',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            +7 (495) 191-03-13
          </a>
        </div>
      </div>
    </header>
  );
}

const TOP_SPACER = 124; // высота nav (44) + отступ (20) + gap (60), т.к. nav теперь position:fixed и не занимает место в потоке

function HeroBlock() {
  return (
    <section
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {/* декоративная графика */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* фон Rectangle 2087329545 — экспортирован из Figma как есть, не пересчитан вручную */}
        <img
          src={`${BASE}/img/escalada/hero-gradient-1.png`}
          alt=""
          style={{
            position: 'absolute',
            left: '-0.1%',
            top: '-91.8%',
            width: '100.1%',
            height: '191.8%',
          }}
        />
        <img
          src={`${BASE}/img/escalada/hero-photo-real.png`}
          alt=""
          style={{
            position: 'absolute',
            left: '42.6%',
            top: '13.7%',
            width: '66.2%',
          }}
        />
        {/* noise grain */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${BASE}/img/escalada/noise.png)`,
            backgroundSize: '400px 400px',
            mixBlendMode: 'soft-light',
            opacity: 0.15,
          }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1440,
          margin: '0 auto',
          height: '100%',
          padding: '20px 40px 60px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: TOP_SPACER, flexShrink: 0 }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'flex-start', transform: 'translateY(-20px)' }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 100,
                  lineHeight: '100px',
                  color: '#fff',
                  letterSpacing: 0,
                }}
              >
                Премиум-
                <br />
                клуб со SPA
                <br />
                и бассейном
              </h1>
              <CtaButton label="Стать членом клуба" />
            </div>
          </div>

          <p
            style={{
              margin: 0,
              maxWidth: 334,
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 18,
              lineHeight: '24px',
              color: '#6b7084',
            }}
          >
            Личное пространство
            <br />
            для тренировок и восстановления
          </p>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '48%',
          bottom: 60,
          width: 60,
          height: 60,
          borderRadius: 99,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 0V22M2 14L10 22L18 14" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}

function StatItem({ num, label }: { num: string; label: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 88,
          lineHeight: '88px',
          color: '#fff',
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 24,
          lineHeight: '28.8px',
          color: '#b0b5cb',
          maxWidth: 230,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function SecondSection() {
  return (
    <section
      style={{
        position: 'relative',
        zIndex: 2,
        height: '100vh',
        marginTop: '-100vh',
        background: '#000',
        borderRadius: '44px 44px 0px 0px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(140% 120% at 78% -12%, rgba(166,176,190,0.6) 0%, rgba(106,117,128,0.6) 15%, rgba(53,55,63,0.6) 50%, rgba(34,30,39,0.6) 100%)',
        }}
      />
      <img
        src={`${BASE}/img/escalada/space-bg.png`}
        alt=""
        style={{ position: 'absolute', left: 0, top: 20, width: '100%', height: 'calc(100% - 40px)', objectFit: 'cover', opacity: 0.9 }}
      />
      <img
        src={`${BASE}/img/escalada/spaceship.png`}
        alt=""
        style={{ position: 'absolute', left: 0, top: 20, width: '100%', height: 'calc(100% - 40px)', objectFit: 'cover' }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1440,
          margin: '0 auto',
          height: '100%',
          padding: '20px 40px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 60,
        }}
      >
        <div style={{ height: TOP_SPACER - 60, flexShrink: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 44, flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 74, flexWrap: 'wrap' }}>
            <StatItem num="4000" label={<>квадратных<br />метров</>} />
            <StatItem num="50+" label={<>групповых<br />занятий</>} />
            <StatItem num="60+" label={<>профессиональных<br />тренеров</>} />
            <StatItem num="250+" label={<>едениц<br />оборудования</>} />
          </div>

          <div
            style={{
              position: 'relative',
              flex: 1,
              borderRadius: 30,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 60,
              backgroundColor: '#0a0a0a',
              backgroundImage:
                `linear-gradient(90deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.7) 32%, rgba(0,0,0,0) 62%), url(${BASE}/img/escalada/trial-card-bg.png)`,
              backgroundSize: 'cover, cover',
              backgroundPosition: 'center, right center',
              backgroundRepeat: 'no-repeat, no-repeat',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
              <h2
                style={{
                  margin: 0,
                  maxWidth: 586,
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 44,
                  lineHeight: '48.4px',
                  color: '#fff',
                }}
              >
                Персональный тест-драйв
                <br />
                в клубе на 7 дней
              </h2>
              <p
                style={{
                  margin: 0,
                  maxWidth: 407,
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: 24,
                  lineHeight: '33px',
                  color: '#b0b5cb',
                }}
              >
                Доступ в тренажёрный зал, бассейн, SPA-зону
                <br />
                и групповые занятия
              </p>
              <div style={{ marginTop: 16 }}>
                <CtaButton label="Узнать подробности" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function EscaladaDemo() {
  return (
    <main style={{ background: '#000' }}>
      <LenisProvider />
      <Nav />
      {/* обёртка 200vh даёт герою "пробег" на прилипание, пока 2 экран наезжает сверху */}
      <div style={{ height: '200vh', position: 'relative' }}>
        <HeroBlock />
      </div>
      <SecondSection />
    </main>
  );
}
