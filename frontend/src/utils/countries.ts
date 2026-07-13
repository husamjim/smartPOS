export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2
  name_en: string;
  name_ar: string;
  currency: string; // ISO 4217
  currency_name_ar: string;
  currency_name_en: string;
  dialCode: string;
  flag: string;
  timezones: string[];
  cities: string[];
  locale: string;
}

export const COUNTRIES: CountryInfo[] = [
  {
    code: 'US',
    name_en: 'United States',
    name_ar: 'الولايات المتحدة',
    currency: 'USD',
    currency_name_en: 'US Dollar',
    currency_name_ar: 'دولار أمريكي',
    dialCode: '+1',
    flag: '🇺🇸',
    timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'America/Adak', 'Pacific/Honolulu'],
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
    locale: 'en-US'
  },
  {
    code: 'GB',
    name_en: 'United Kingdom',
    name_ar: 'المملكة المتحدة',
    currency: 'GBP',
    currency_name_en: 'British Pound',
    currency_name_ar: 'جنيه إسترليني',
    dialCode: '+44',
    flag: '🇬🇧',
    timezones: ['Europe/London'],
    cities: ['London', 'Birmingham', 'Glasgow', 'Liverpool', 'Bristol', 'Manchester', 'Sheffield', 'Leeds', 'Edinburgh', 'Leicester'],
    locale: 'en-GB'
  },
  {
    code: 'SA',
    name_en: 'Saudi Arabia',
    name_ar: 'المملكة العربية السعودية',
    currency: 'SAR',
    currency_name_en: 'Saudi Riyal',
    currency_name_ar: 'ريال سعودي',
    dialCode: '+966',
    flag: '🇸🇦',
    timezones: ['Asia/Riyadh'],
    cities: ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah', 'Khobar', 'Tabuk', 'Abha', 'Buraidah', 'Jail'],
    locale: 'ar-SA'
  },
  {
    code: 'AE',
    name_en: 'United Arab Emirates',
    name_ar: 'الإمارات العربية المتحدة',
    currency: 'AED',
    currency_name_en: 'UAE Dirham',
    currency_name_ar: 'درهم إماراتي',
    dialCode: '+971',
    flag: '🇦🇪',
    timezones: ['Asia/Dubai'],
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
    locale: 'ar-AE'
  },
  {
    code: 'EG',
    name_en: 'Egypt',
    name_ar: 'جمهورية مصر العربية',
    currency: 'EGP',
    currency_name_en: 'Egyptian Pound',
    currency_name_ar: 'جنيه مصري',
    dialCode: '+20',
    flag: '🇪🇬',
    timezones: ['Africa/Cairo'],
    cities: ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez', 'Mansoura', 'Tanta', 'Asyut', 'Luxor'],
    locale: 'ar-EG'
  },
  {
    code: 'KW',
    name_en: 'Kuwait',
    name_ar: 'الكويت',
    currency: 'KWD',
    currency_name_en: 'Kuwaiti Dinar',
    currency_name_ar: 'دينار كويتي',
    dialCode: '+965',
    flag: '🇰🇼',
    timezones: ['Asia/Kuwait'],
    cities: ['Kuwait City', 'Hawalli', 'Salmiya', 'Jahra', 'Fahaheel', 'Farwaniya'],
    locale: 'ar-KW'
  },
  {
    code: 'QA',
    name_en: 'Qatar',
    name_ar: 'قطر',
    currency: 'QAR',
    currency_name_en: 'Qatari Riyal',
    currency_name_ar: 'ريال قطري',
    dialCode: '+974',
    flag: '🇶🇦',
    timezones: ['Asia/Qatar'],
    cities: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Umm Salal', 'Madinat ash Shamal'],
    locale: 'ar-QA'
  },
  {
    code: 'BH',
    name_en: 'Bahrain',
    name_ar: 'البحرين',
    currency: 'BHD',
    currency_name_en: 'Bahraini Dinar',
    currency_name_ar: 'دينار بحريني',
    dialCode: '+973',
    flag: '🇧🇭',
    timezones: ['Asia/Bahrain'],
    cities: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town', 'Aali', 'Sitra'],
    locale: 'ar-BH'
  },
  {
    code: 'OM',
    name_en: 'Oman',
    name_ar: 'عمان',
    currency: 'OMR',
    currency_name_en: 'Omani Rial',
    currency_name_ar: 'ريال عماني',
    dialCode: '+968',
    flag: '🇴🇲',
    timezones: ['Asia/Muscat'],
    cities: ['Muscat', 'Salalah', 'Seeb', 'Sohar', 'Nizwa', 'Sur', 'Ibri', 'Rustaq'],
    locale: 'ar-OM'
  },
  {
    code: 'JO',
    name_en: 'Jordan',
    name_ar: 'الأردن',
    currency: 'JOD',
    currency_name_en: 'Jordanian Dinar',
    currency_name_ar: 'دينار أردني',
    dialCode: '+962',
    flag: '🇯🇴',
    timezones: ['Asia/Amman'],
    cities: ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Salt', 'Madaba', 'Mafraq', 'Jerash'],
    locale: 'ar-JO'
  },
  {
    code: 'FR',
    name_en: 'France',
    name_ar: 'فرنسا',
    currency: 'EUR',
    currency_name_en: 'Euro',
    currency_name_ar: 'يورو',
    dialCode: '+33',
    flag: '🇫🇷',
    timezones: ['Europe/Paris'],
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
    locale: 'fr-FR'
  },
  {
    code: 'DE',
    name_en: 'Germany',
    name_ar: 'ألمانيا',
    currency: 'EUR',
    currency_name_en: 'Euro',
    currency_name_ar: 'يورو',
    dialCode: '+49',
    flag: '🇩🇪',
    timezones: ['Europe/Berlin'],
    cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'],
    locale: 'de-DE'
  },
  {
    code: 'JP',
    name_en: 'Japan',
    name_ar: 'اليابان',
    currency: 'JPY',
    currency_name_en: 'Japanese Yen',
    currency_name_ar: 'ين ياباني',
    dialCode: '+81',
    flag: '🇯🇵',
    timezones: ['Asia/Tokyo'],
    cities: ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Hiroshima', 'Sendai'],
    locale: 'ja-JP'
  },
  {
    code: 'IN',
    name_en: 'India',
    name_ar: 'الهند',
    currency: 'INR',
    currency_name_en: 'Indian Rupee',
    currency_name_ar: 'روبية هندية',
    dialCode: '+91',
    flag: '🇮🇳',
    timezones: ['Asia/Kolkata'],
    cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur'],
    locale: 'en-IN'
  },
  {
    code: 'CA',
    name_en: 'Canada',
    name_ar: 'كندا',
    currency: 'CAD',
    currency_name_en: 'Canadian Dollar',
    currency_name_ar: 'دولار كندي',
    dialCode: '+1',
    flag: '🇨🇦',
    timezones: ['America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax', 'America/St_Johns'],
    cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Quebec City', 'Winnipeg', 'Hamilton'],
    locale: 'en-CA'
  },
  {
    code: 'SD',
    name_en: 'Sudan',
    name_ar: 'السودان',
    currency: 'SDG',
    currency_name_en: 'Sudanese Pound',
    currency_name_ar: 'جنيه سوداني',
    dialCode: '+249',
    flag: '🇸🇩',
    timezones: ['Africa/Khartoum'],
    cities: ['Khartoum', 'Omdurman', 'Khartoum Bahri', 'Nyala', 'Port Sudan', 'Kassala', 'El Obeid'],
    locale: 'ar-SD'
  },
  {
    code: 'ES',
    name_en: 'Spain',
    name_ar: 'إسبانيا',
    currency: 'EUR',
    currency_name_en: 'Euro',
    currency_name_ar: 'يورو',
    dialCode: '+34',
    flag: '🇪🇸',
    timezones: ['Europe/Madrid', 'Atlantic/Canary'],
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Malaga', 'Murcia', 'Palma'],
    locale: 'es-ES'
  },
  {
    code: 'TR',
    name_en: 'Turkey',
    name_ar: 'تركيا',
    currency: 'TRY',
    currency_name_en: 'Turkish Lira',
    currency_name_ar: 'ليرة تركية',
    dialCode: '+90',
    flag: '🇹🇷',
    timezones: ['Europe/Istanbul'],
    cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep'],
    locale: 'tr-TR'
  }
];

export function getCountryByCode(code: string): CountryInfo | undefined {
  return COUNTRIES.find(c => c.code.toUpperCase() === code.toUpperCase());
}
