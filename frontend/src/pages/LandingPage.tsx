import React from 'react';
import { 
  ChefHat, 
  Pill, 
  Shirt, 
  Ship, 
  Warehouse, 
  Sparkles, 
  Globe, 
  Lock, 
  UserPlus, 
  Wifi, 
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface LandingPageProps {
  language: string;
  changeLanguage: (lng: string) => void;
  onNavigate: (view: 'login' | 'signup' | 'demo') => void;
}

const translations: Record<string, any> = {
  ar: {
    heroTitle: "نظام كاشير POS وإدارة موارد ERP متكامل ذكي",
    heroDesc: "الحل الشامل والذكي لإدارة المطاعم، الصيدليات، محلات التجزئة، شركات الجملة، والمستودعات الضخمة. يدعم العمل بالكامل بدون إنترنت مع مزامنة سحابية فائقة الأمان ومساعد ذكاء اصطناعي مدمج.",
    loginBtn: "تسجيل الدخول للنظام",
    signupBtn: "سجل الآن كعميل جديد",
    sectorsTitle: "مجالات العمل والقطاعات المدعومة",
    sectorsDesc: "تم تصميم وتخصيص النظام ليناسب احتياجات كل نشاط تجاري بشكل دقيق ومحكم.",
    featuresTitle: "لماذا تختار نظامنا الذكي؟",
    featuresDesc: "ميزات استثنائية تجعل إدارة أعمالك أسهل، أسرع، وأكثر كفاءة وأماناً.",
    restaurantTitle: "المطاعم والمقاهي",
    restaurantDesc: "إدارة الطاولات، تقسيم الفواتير، شاشة المطبخ KDS، والمواصفات المخصصة.",
    pharmacyTitle: "الصيدليات والمراكز الطبية",
    pharmacyDesc: "تتبع الباتشات والصلاحيات، البدائل العلمية للأدوية، وتنبيهات انتهاء الصلاحية.",
    retailTitle: "التجزئة ومحلات الملابس",
    retailDesc: "إدارة المقاسات والألوان، طباعة ملصقات الباركود، والبيع بالتجزئة السريع.",
    wholesaleTitle: "الاستيراد والتصدير والجملة",
    wholesaleDesc: "تتبع الحاويات، حسابات جمارك الموانئ، والتحويل متعدد العملات.",
    warehouseTitle: "المستودعات والمخازن والخدمات اللوجستية",
    warehouseDesc: "إدارة المخزون متعدد الفروع، جرد البضائع بالباركود، وطباعة ملصقات الرفوف.",
    offlineTitle: "العمل بدون اتصال بالإنترنت",
    offlineDesc: "واصل البيع وإصدار الفواتير حتى عند انقطاع الإنترنت، وسيقوم النظام بالمزامنة فور عودته.",
    aiTitle: "الذكاء الاصطناعي والتنبؤات",
    aiDesc: "مساعد مدمج للتنبؤ بالمبيعات واقتراح كميات إعادة الطلب وتنبيهات المخزون تلقائياً.",
    globalTitle: "دعم عالمي كامل",
    globalDesc: "مهيأ بالكامل للجمهور العالمي بـ 5 لغات مدعومة، مع تكامل العملات والضرائب.",
    secureTitle: "أمان واستقرار فائق",
    secureDesc: "تشفير كامل للبيانات، إدارة صلاحيات دقيقة للموظفين، وحفظ احتياطي دوري.",
    tagline: "النظام الذكي المتكامل للبيع وإدارة الموارد",
    demoBtn: "🔥 تجربة ديمو سريعة"
  },
  en: {
    heroTitle: "Intelligent Cashier POS & Full ERP System",
    heroDesc: "The ultimate solution for managing Restaurants, Pharmacies, Retail, Wholesale, and Warehouses. Supports complete offline operation with ultra-secure cloud sync and integrated AI.",
    loginBtn: "Login to System",
    signupBtn: "Register New Account",
    sectorsTitle: "Business Sectors & Supported Fields",
    sectorsDesc: "Tailored structures to suit the requirements of every business type precisely.",
    featuresTitle: "Why Choose Our Smart POS?",
    featuresDesc: "Outstanding features that make managing your business easier, faster, and more secure.",
    restaurantTitle: "Restaurants & Cafés",
    restaurantDesc: "Table layout management, bill splitting, Kitchen KDS, and customized modifiers.",
    pharmacyTitle: "Pharmacies & Medical Centers",
    pharmacyDesc: "Batch & expiry tracking, chemical substitutions, and near-expiry alerts.",
    retailTitle: "Retail & Apparel Stores",
    retailDesc: "Size & color matrix tracking, barcode printing, and fast retail workflows.",
    wholesaleTitle: "Import, Export & Wholesale",
    wholesaleDesc: "Container tracking, customs duties calculator, and multi-currency registers.",
    warehouseTitle: "Warehouses & Logistics",
    warehouseDesc: "Multi-branch inventory control, barcode physical audits, and bin labels.",
    offlineTitle: "Offline-First Operation",
    offlineDesc: "Keep selling and generating invoices without internet; data will sync automatically once online.",
    aiTitle: "AI Forecasting & Assistant",
    aiDesc: "Predict sales patterns, auto-suggest reorder quantities, and converse with our AI assistant.",
    globalTitle: "Global Target Scale",
    globalDesc: "Fully optimized for global audiences with 5 languages, customizable taxes, and currencies.",
    secureTitle: "Premium Security & Speed",
    secureDesc: "End-to-end local data encryption, granular employee permissions, and scheduled backups.",
    tagline: "Integrated POS/ERP for Smart Businesses",
    demoBtn: "🔥 Try Quick Demo"
  },
  fr: {
    heroTitle: "Système Intelligent POS de Caisse et ERP Complet",
    heroDesc: "La solution ultime pour la gestion des Restaurants, Pharmacies, Commerce de détail, de gros et Entrepôts. Fonctionne hors ligne avec synchronisation cloud sécurisée et IA intégrée.",
    loginBtn: "Se Connecter",
    signupBtn: "S'inscrire comme Client",
    sectorsTitle: "Secteurs d'activité et Domaines Supportés",
    sectorsDesc: "Structures sur mesure pour répondre précisément aux exigences de chaque type d'entreprise.",
    featuresTitle: "Pourquoi Choisir Notre POS Intelligent?",
    featuresDesc: "Des fonctionnalités exceptionnelles qui rendent la gestion plus simple, plus rapide et plus sûre.",
    restaurantTitle: "Restaurants & Cafés",
    restaurantDesc: "Gestion des tables, division des notes, écran cuisine KDS, et modificateurs personnalisés.",
    pharmacyTitle: "Pharmacies & Centres Médicaux",
    pharmacyDesc: "Suivi des lots et dates de péremption, substitutions chimiques, et alertes de péremption.",
    retailTitle: "Détail & Magasins de Vêtements",
    retailDesc: "Suivi des tailles et couleurs, impression de codes-barres, et flux de vente rapides.",
    wholesaleTitle: "Import, Export & Vente en Gros",
    wholesaleDesc: "Suivi des conteneurs, calcul des taxes douanières, et caisses multi-devises.",
    warehouseTitle: "Entrepôts & Logistique",
    warehouseDesc: "Contrôle des stocks multi-succursales, audits physiques par codes-barres et étiquettes.",
    offlineTitle: "Fonctionnement Hors Ligne",
    offlineDesc: "Continuez à vendre sans internet; les données se synchroniseront automatiquement une fois en ligne.",
    aiTitle: "Prévisions & Assistant IA",
    aiDesc: "Prédisez les tendances de vente, suggérez les réapprovisionnements et discutez avec l'IA.",
    globalTitle: "Échelle Mondiale Ciblée",
    globalDesc: "Optimisé pour un public mondial avec 5 langues, taxes personnalisées et devises.",
    secureTitle: "Sécurité & Stabilité Premium",
    secureDesc: "Chiffrement des données locales, autorisations des employés et sauvegardes régulières.",
    tagline: "Système POS/ERP Intégré pour Entreprises Intelligentes",
    demoBtn: "🔥 Démo Rapide"
  },
  de: {
    heroTitle: "Intelligentes Kassensystem (POS) & Komplettes ERP",
    heroDesc: "Die ultimative Lösung für Restaurants, Apotheken, Einzelhandel, Großhandel und Lagerhäuser. Unterstützt Offline-Betrieb mit sicherer Cloud-Synchronisierung und integrierter KI.",
    loginBtn: "Im System anmelden",
    signupBtn: "Kundenkonto registrieren",
    sectorsTitle: "Geschäftsbereiche & Unterstützte Branchen",
    sectorsDesc: "Maßgeschneiderte Strukturen, die exakt auf die Anforderungen jedes Typs abgestimmt sind.",
    featuresTitle: "Warum unser intelligentes POS wählen?",
    featuresDesc: "Herausragende Funktionen, die Ihr Geschäftsmanagement einfacher, schneller und sicherer machen.",
    restaurantTitle: "Restaurants & Cafés",
    restaurantDesc: "Tischplanverwaltung, Rechnungen teilen, Küchenmonitor KDS und Modifikatoren.",
    pharmacyTitle: "Apotheken & Medizinische Zentren",
    pharmacyDesc: "Chargen- und Verfallsdatumsverfolgung, Wirkstoffsuche und Ablaufwarnungen.",
    retailTitle: "Einzelhandel & Bekleidungsgeschäfte",
    retailDesc: "Größen- und Farben-Verfolgung, Barcodedruck und schnelle Kassierabläufe.",
    wholesaleTitle: "Import, Export & Großhandel",
    wholesaleDesc: "Containerverfolgung, Zollgebührenrechner und Kassen mit Währungsauswahl.",
    warehouseTitle: "Lagerhäuser & Logistik",
    warehouseDesc: "Mehrere Lagerstandorte steuern, physische Barcode-Audits und Regaletiketten.",
    offlineTitle: "Offline-Modus Zuerst",
    offlineDesc: "Verkäufe und Bons ohne Internet erstellen; Daten synchronisieren sich automatisch bei Verbindung.",
    aiTitle: "KI-Prognosen & Assistent",
    aiDesc: "Verkaufsmuster vorhersagen, Mengen automatisch vorschlagen und mit der KI chatten.",
    globalTitle: "Globale Zielgruppe",
    globalDesc: "Optimiert für weltweite Kunden mit 5 Sprachen, anpassbaren Steuern und Währungen.",
    secureTitle: "Premium-Sicherheit & Stabilität",
    secureDesc: "Lokale Datenverschlüsselung, granulare Benutzerrechte und regelmäßige Backups.",
    tagline: "Integriertes POS/ERP für intelligente Unternehmen",
    demoBtn: "🔥 Kassendemo"
  },
  zh: {
    heroTitle: "智能收银 POS 兼一体化 ERP 系统",
    heroDesc: "管理餐饮、药房、零售、批发和仓库的终极智能解决方案。支持完全离线操作、超安全云端同步以及内置 AI 助手。",
    loginBtn: "登录系统",
    signupBtn: "注册新商户",
    sectorsTitle: "支持的业务领域与行业",
    sectorsDesc: "专为满足各种商业类型的精确需求而定制的系统架构。",
    featuresTitle: "为什么选择我们的智能 POS？",
    featuresDesc: "杰出的功能，让您的业务管理更轻松、更快速、更安全。",
    restaurantTitle: "餐饮与咖啡厅",
    restaurantDesc: "桌位排布管理、分账付款、厨房显示系统 KDS 以及自定义规格加料。",
    pharmacyTitle: "药房与医疗中心",
    pharmacyDesc: "药品批次与有效期跟踪、化学成分替代品搜索以及临期警告通知。",
    retailTitle: "零售与服装店",
    retailDesc: "商品尺码与颜色矩阵跟踪、条形码打印以及快速零售结账流程。",
    wholesaleTitle: "进出口与批发贸易",
    wholesaleDesc: "集装箱跟踪、海关关税计算器以及多币种结账收银台。",
    warehouseTitle: "仓库与物流仓储",
    warehouseDesc: "多分支机构库存控制、条形码物理盘点以及货架标签打印。",
    offlineTitle: "离线优先运行",
    offlineDesc: "在断网时继续收银和开票；一旦恢复连接，系统数据将自动同步云端。",
    aiTitle: "AI 预测与智能助手",
    aiDesc: "预测销售模式、自动建议补货数量，并与我们的 AI 助手直接对话。",
    globalTitle: "面向全球化设计",
    globalDesc: "支持 5 种语言、可自定义税率和货币，完全为全球商户量身定制。",
    secureTitle: "安全保障与稳定性",
    secureDesc: "端到端本地 data 加密、细粒度的员工权限管理以及定期自动备份。",
    tagline: "智能商户一体化收银 POS/ERP 系统",
    demoBtn: "🔥 快速演示模式"
  }
};

export const LandingPage: React.FC<LandingPageProps> = ({ language, changeLanguage, onNavigate }) => {
  const isRtl = language === 'ar';
  const t = translations[language] || translations['en'];

  const sectors = [
    { icon: ChefHat, title: t.restaurantTitle, desc: t.restaurantDesc, color: 'from-orange-500/20 to-amber-500/10 text-orange-500 border-orange-500/20' },
    { icon: Pill, title: t.pharmacyTitle, desc: t.pharmacyDesc, color: 'from-emerald-500/20 to-teal-500/10 text-emerald-500 border-emerald-500/20' },
    { icon: Shirt, title: t.retailTitle, desc: t.retailDesc, color: 'from-purple-500/20 to-pink-500/10 text-purple-500 border-purple-500/20' },
    { icon: Ship, title: t.wholesaleTitle, desc: t.wholesaleDesc, color: 'from-sky-500/20 to-blue-500/10 text-sky-500 border-sky-500/20' },
    { icon: Warehouse, title: t.warehouseTitle, desc: t.warehouseDesc, color: 'from-blue-600/20 to-cyan-500/10 text-blue-500 border-blue-500/20' }
  ];

  const features = [
    { icon: Wifi, title: t.offlineTitle, desc: t.offlineDesc },
    { icon: Sparkles, title: t.aiTitle, desc: t.aiDesc },
    { icon: Globe, title: t.globalTitle, desc: t.globalDesc },
    { icon: Lock, title: t.secureTitle, desc: t.secureDesc }
  ];

  return (
    <div className={`min-h-screen bg-[#090d16] text-white flex flex-col justify-between font-sans overflow-x-hidden selection:bg-blue-600 selection:text-white ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/40">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="smart POS" className="h-10 w-10 object-contain filter drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
          <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 bg-clip-text text-transparent">
            {isRtl ? 'سمارت POS' : 'smart POS'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <select 
              value={language} 
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ar" className="bg-slate-950 text-slate-200">العربية</option>
              <option value="en" className="bg-slate-950 text-slate-200">English</option>
              <option value="fr" className="bg-slate-950 text-slate-200">Français</option>
              <option value="de" className="bg-slate-950 text-slate-200">Deutsch</option>
              <option value="zh" className="bg-slate-950 text-slate-200">中文</option>
            </select>
          </div>

          <button 
            onClick={() => onNavigate('demo')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-orange-400 border border-orange-500/20 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isRtl ? 'ديمو' : 'Demo'}</span>
          </button>

          <button 
            onClick={() => onNavigate('login')}
            className="px-4 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all shadow-md"
          >
            {t.loginBtn}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-20 text-center space-y-8">
          {/* Neon background glows */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold animate-pulse uppercase tracking-wider mx-auto">
            <Sparkles className="h-3.5 w-3.5" />
            {t.tagline}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent font-sans">
            {t.heroTitle}
          </h1>

          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed font-sans">
            {t.heroDesc}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => onNavigate('signup')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-900/35 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4.5 w-4.5" />
              <span>{t.signupBtn}</span>
              {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
            
            <button 
              onClick={() => onNavigate('demo')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-950/35 transition-all flex items-center justify-center gap-2 font-sans border-none"
            >
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              <span>{t.demoBtn}</span>
            </button>

            <button 
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-750 text-slate-200 font-bold text-sm transition-all"
            >
              {t.loginBtn}
            </button>
          </div>
        </section>

        {/* Sectors Grid */}
        <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold font-sans">{t.sectorsTitle}</h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">{t.sectorsDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {sectors.map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <div 
                  key={idx} 
                  className={`p-6 rounded-2xl border bg-slate-950/60 border-slate-900/70 hover:border-slate-800 transition-all flex flex-col justify-between h-56 group`}
                >
                  <div className="space-y-4">
                    <div className={`p-3 rounded-xl border w-fit bg-gradient-to-br ${sec.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-200 group-hover:text-white transition-colors">{sec.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{sec.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Technical Features Section */}
        <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold font-sans">{t.featuresTitle}</h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">{t.featuresDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={idx} 
                  className="flex gap-4 p-5 rounded-2xl bg-slate-950/40 border border-slate-900/60 items-start hover:bg-slate-950/80 transition-all"
                >
                  <div className="p-3 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/10 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm text-slate-200">{feat.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-[10px] text-slate-500 font-mono">
        <div>© 2026 smart POS & ERP System. All Rights Reserved.</div>
        <div className="mt-1 text-slate-600">Global Target Audience Scale | Multi-Language Edition</div>
      </footer>
    </div>
  );
};
