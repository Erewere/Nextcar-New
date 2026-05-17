import React, { useState, useEffect, useMemo, useRef, Component } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams, 
  useLocation 
} from 'react-router-dom';
import { 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Car,
  ShieldCheck,
  CreditCard,
  Smartphone,
  LogOut,
  LogIn,
  Filter,
  ArrowUpDown,
  Bot
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  orderBy, 
  where, 
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, handleFirestoreError, OperationType } from './firebase';
import { cn } from './lib/utils';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Algo salió mal.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Error de base de datos: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Ups, algo salió mal</h2>
          <p className="text-gray-500 mb-8">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-black text-white px-8 py-3 rounded-xl font-bold"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Types ---
interface CarData {
  id?: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  bodyType: string;
  transmission: string;
  engineType?: string;
  horsepower?: string;
  fuelConsumption?: string;
  passengers: number;
  description: string;
  images: string[];
  features: string[];
  highlights: string[];
  createdAt?: any;
  status?: 'available' | 'sold';
}

// --- Seed Data ---
const seedCars: CarData[] = [
  {
    brand: "Toyota",
    model: "Corolla",
    year: 2022,
    price: 25000,
    mileage: 15000,
    bodyType: "Sedán",
    transmission: "Automática",
    passengers: 5,
    description: "Un auto confiable, eficiente y con un diseño moderno. Ideal para la ciudad y viajes largos.",
    images: [
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=1000&auto=format&fit=crop"
    ],
    features: ["Apple CarPlay", "Cámara de reversa", "Control crucero adaptativo"],
    highlights: ["Bajo consumo de combustible", "Excelente valor de reventa", "Seguridad avanzada"]
  },
  {
    brand: "Audi",
    model: "A3",
    year: 2021,
    price: 35000,
    mileage: 22000,
    bodyType: "Hatchback",
    transmission: "S-Tronic",
    passengers: 5,
    description: "Lujo compacto con un rendimiento excepcional. El balance perfecto entre elegancia y deportividad.",
    images: [
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?q=80&w=1000&auto=format&fit=crop"
    ],
    features: ["Virtual Cockpit", "Sonido Bang & Olufsen", "Techo panorámico"],
    highlights: ["Diseño premium", "Tecnología de vanguardia", "Manejo dinámico"]
  },
  {
    brand: "Jeep",
    model: "Wrangler",
    year: 2023,
    price: 55000,
    mileage: 5000,
    bodyType: "SUV",
    transmission: "Automática 4x4",
    passengers: 5,
    description: "La libertad de ir a cualquier lugar. El ícono del off-road con toda la tecnología moderna.",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1539101102904-a81142264e14?q=80&w=1000&auto=format&fit=crop"
    ],
    features: ["4WD", "Puertas desmontables", "Pantalla táctil 8.4\""],
    highlights: ["Capacidad todoterreno", "Diseño icónico", "Aventura garantizada"]
  }
];

// --- Components ---

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const ParallaxImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <div ref={ref} className={cn("overflow-hidden relative", className)}>
      <motion.img 
        style={{ y, scale: 1.3 }}
        src={src} 
        alt={alt} 
        className="w-full h-full object-cover origin-center"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
      scrolled ? "bg-white/90 backdrop-blur-xl border-b-4 border-black py-4" : "bg-transparent border-transparent py-8"
    )}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link to="/" className={cn("text-3xl font-display font-black tracking-tighter uppercase transition-colors", (scrolled || pathname !== '/') ? "text-black" : "text-white")}>
          NEXT<span className="text-[#e11d48]">CAR</span>
        </Link>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-12 absolute left-1/2 transform -translate-x-1/2">
          <Link to="/catalogo" className={cn("text-sm font-bold uppercase tracking-widest hover:text-[#e11d48] transition-colors", pathname === '/catalogo' ? "text-[#e11d48]" : ((scrolled || pathname !== '/') ? "text-gray-900" : "text-white"))}>Comprar Auto</Link>
          <Link to="/vender" className={cn("text-sm font-bold uppercase tracking-widest hover:text-[#e11d48] transition-colors", pathname === '/vender' ? "text-[#e11d48]" : ((scrolled || pathname !== '/') ? "text-gray-900" : "text-white"))}>Vender Auto</Link>
          <Link to="/consignacion" className={cn("text-sm font-bold uppercase tracking-widest hover:text-[#e11d48] transition-colors", pathname === '/consignacion' ? "text-[#e11d48]" : ((scrolled || pathname !== '/') ? "text-gray-900" : "text-white"))}>Consignación</Link>
          <Link to="/nosotros" className={cn("text-sm font-bold uppercase tracking-widest hover:text-[#e11d48] transition-colors", pathname === '/nosotros' ? "text-[#e11d48]" : ((scrolled || pathname !== '/') ? "text-gray-900" : "text-white"))}>Nosotros</Link>
        </div>

        <div className="hidden md:flex items-center">
          <Link to="/admin" className={cn("bg-[#e11d48] text-white px-6 py-2 border-2 border-transparent font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1")}>
            App Nextcar
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button className={cn("md:hidden", (scrolled || pathname !== '/') ? "text-black" : "text-white")} onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-black overflow-hidden"
          >
            <div className="flex flex-col p-6 space-y-6">
              <Link to="/catalogo" onClick={() => setIsOpen(false)} className="text-xl font-bold uppercase tracking-widest">Comprar Auto</Link>
              <Link to="/vender" onClick={() => setIsOpen(false)} className="text-xl font-bold uppercase tracking-widest">Vender Auto</Link>
              <Link to="/consignacion" onClick={() => setIsOpen(false)} className="text-xl font-bold uppercase tracking-widest">Consignación</Link>
              <Link to="/nosotros" onClick={() => setIsOpen(false)} className="text-xl font-bold uppercase tracking-widest">Nosotros</Link>
              <Link to="/admin" onClick={() => setIsOpen(false)} className="bg-[#e11d48] text-white px-6 py-3 border-2 border-black font-bold uppercase tracking-widest text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">App Nextcar</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-[#111] text-white py-24 px-6 border-t-8 border-[#e11d48]">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 border-b-2 border-gray-800 pb-12">
      <div className="space-y-6 md:w-1/3">
        <h3 className="text-4xl font-display font-black tracking-tighter uppercase text-white">NEXT<span className="text-[#e11d48]">CAR</span></h3>
        <p className="text-gray-400 text-sm max-w-xs font-bold uppercase tracking-wider leading-relaxed">
          La evolución en la compra y venta de autos seminuevos.
        </p>
      </div>
      <div className="md:w-1/3">
        <h4 className="font-display font-black text-xl uppercase tracking-widest mb-6 text-white text-shadow-sm">Contacto</h4>
        <ul className="space-y-4 text-gray-400 font-bold text-sm tracking-wider uppercase">
          <li className="flex items-start gap-2"><span>📍</span> Celaya, Guanajuato, México</li>
          <li className="flex items-start gap-2"><span>📧</span> contacto@nextcar.shop</li>
        </ul>
      </div>
      <div className="md:w-1/3">
        <h4 className="font-display font-black text-xl uppercase tracking-widest mb-6 text-white text-shadow-sm">Plataforma</h4>
        <ul className="space-y-4 text-[#e11d48] font-bold text-sm tracking-wider uppercase">
          <li><Link to="/match" className="hover:text-white transition-colors">Nextcar Match</Link></li>
          <li><Link to="/privacidad" className="hover:text-white transition-colors">Aviso de Privacidad</Link></li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto pt-12 text-center">
      <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">© 2026 Nextcar.</p>
    </div>
  </footer>
);

const FinancialCalculator: React.FC<{ price: number }> = ({ price }) => {
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [months, setMonths] = useState(48);
  const nominalInterest = 14.99;
  const effectiveAnnualInterest = 0.176665;

  const monthlyPayment = useMemo(() => {
    const downPayment = price * (downPaymentPercent / 100);
    const loanAmount = price - downPayment;
    const monthlyInterest = effectiveAnnualInterest / 12;
    const payment = (loanAmount * monthlyInterest * Math.pow(1 + monthlyInterest, months)) / (Math.pow(1 + monthlyInterest, months) - 1);
    return Math.round(payment);
  }, [price, downPaymentPercent, months]);

  return (
    <div className="bg-white border-4 border-black p-8 space-y-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h3 className="text-3xl font-display font-black tracking-tighter uppercase">Cotizador Financiero</h3>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-base font-bold mb-4 uppercase tracking-widest">
            <span className="text-gray-500">Enganche ({downPaymentPercent}%)</span>
            <span className="text-[#3b82f6]">${(price * (downPaymentPercent / 100)).toLocaleString()}</span>
          </div>
          <input 
            type="range" min="10" max="80" step="5" 
            value={downPaymentPercent} 
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 appearance-none cursor-pointer accent-[#e11d48]"
          />
        </div>

        <div>
          <div className="flex justify-between text-base font-bold mb-4 uppercase tracking-widest">
            <span className="text-gray-500">Plazo</span>
            <span className="text-black">{months} meses</span>
          </div>
          <div className="flex gap-2">
            {[12, 24, 36, 48, 60].map(m => (
              <button 
                key={m}
                onClick={() => setMonths(m)}
                className={cn(
                  "flex-1 py-3 text-sm font-bold uppercase transition-all border-2",
                  months === m ? "bg-[#3b82f6] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black border-black hover:bg-gray-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t-4 border-black">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-bold">Mensualidad estimada</p>
        <p className="text-5xl font-display font-black tracking-tighter">${monthlyPayment.toLocaleString()}</p>
        <p className="text-[10px] text-gray-400 mt-2 font-bold tracking-widest">*Sujeto a aprobación de crédito. Tasa nominal del {nominalInterest}% anual fija (+ IVA).</p>
      </div>
    </div>
  );
};

// --- Views ---

const Home = ({ cars, pageSettings }: { cars: CarData[], pageSettings: any }) => {
  const recentCars = useMemo(() => cars.slice(0, 3), [cars]);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 1000], [0, 300]);
  const textY = useTransform(scrollY, [0, 1000], [0, -150]);

  return (
    <div className="pt-0 bg-[#fafafa]">
      {/* Hero */}
      <section className="relative h-[110vh] flex items-center justify-center overflow-hidden bg-black">
        <motion.div 
          style={{ y: heroY }}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 z-0 origin-center"
        >
          <img 
            src={pageSettings.homeHeroImage} 
            alt="Hero Car" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 z-0" />

        <div className="relative z-10 text-center px-6 w-full mt-20 max-w-5xl mx-auto">
          <motion.div
            style={{ y: textY }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-[10vw] md:text-[6vw] leading-none font-display font-black text-white uppercase tracking-tighter mb-6 mix-blend-difference">
                La seguridad de una agencia,<br />
                <span className="text-transparent" style={{ WebkitTextStroke: "2px white" }}>al precio de un trato directo.</span>
              </h1>
              <p className="text-white text-lg md:text-xl max-w-3xl mx-auto mb-12 font-bold uppercase tracking-widest drop-shadow-md">
                Compra o vende tu seminuevo en el Bajío sin riesgos, sin fraudes y con blindaje legal y mecánico.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link to="/catalogo" className="inline-flex items-center justify-center gap-4 bg-[#e11d48] text-white px-10 py-5 rounded-none font-display font-black text-xl uppercase tracking-widest hover:bg-white hover:text-black transition-colors duration-300 border-4 border-transparent hover:border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2">
                  Ver Inventario <ArrowRight size={24} />
                </Link>
                <Link to="/vender" className="inline-flex items-center justify-center gap-4 bg-transparent text-white px-10 py-5 rounded-none font-display font-black text-xl uppercase tracking-widest hover:bg-white hover:text-black transition-colors duration-300 border-4 border-white hover:border-black shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2">
                  Cotizar mi Auto
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Barra de Confianza */}
      <section className="bg-white py-12 px-6 border-b-8 border-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🛡️</span>
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tighter mb-1">Garantía Legal.</h3>
              <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Sin reportes de robo ni adeudos ocultos.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-4xl">⚙️</span>
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tighter mb-1">Inspección 120 Puntos.</h3>
              <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Diagnóstico mecánico exhaustivo.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-4xl">🤝</span>
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tighter mb-1">Trato Directo Seguro.</h3>
              <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Conectamos particulares a precios justos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vender */}
      <section className="py-32 px-6 bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl font-display font-black tracking-tighter uppercase leading-none mb-6">
              ¿Vendes tu auto? Tú tienes el control.
            </h2>
            <p className="text-black font-bold uppercase tracking-widest text-lg md:text-xl">
              Olvídate de los riesgos de publicar en redes sociales. Elige tu mejor opción.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <FadeIn>
              <div className="bg-white border-4 border-black p-12 h-full flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-all">
                <h3 className="text-4xl font-display font-black uppercase tracking-tighter mb-6">Compra Directa 💸</h3>
                <p className="text-gray-600 font-bold uppercase tracking-widest leading-relaxed mb-12 flex-1">
                  ¿Te urge liquidez? Evaluamos tu auto hoy mismo y te pagamos al instante mediante transferencia segura.
                </p>
                <Link to="/vender" className="w-full inline-block text-center border-4 border-black bg-black text-white font-display font-black text-xl uppercase py-5 hover:bg-white hover:text-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                  Agendar Avalúo
                </Link>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="bg-white border-4 border-[#e11d48] p-12 h-full flex flex-col shadow-[8px_8px_0px_0px_rgba(225,29,72,1)] hover:shadow-[12px_12px_0px_0px_rgba(225,29,72,1)] hover:-translate-y-2 transition-all">
                <h3 className="text-4xl font-display font-black uppercase tracking-tighter mb-6 text-[#e11d48]">Consignación 📈</h3>
                <p className="text-gray-600 font-bold uppercase tracking-widest leading-relaxed mb-12 flex-1">
                  Nosotros lo vendemos por ti. Lo preparamos, tomamos fotos profesionales y logramos el valor real de mercado.
                </p>
                <Link to="/consignacion" className="w-full inline-block text-center border-4 border-[#e11d48] bg-[#e11d48] text-white font-display font-black text-xl uppercase py-5 hover:bg-white hover:text-[#e11d48] transition-colors shadow-[4px_4px_0px_0px_rgba(225,29,72,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                  Quiero Consignar
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Comprar (Inventario Destacado) */}
      <section className="py-40 px-6 max-w-7xl mx-auto">
        <FadeIn className="flex flex-col md:flex-row md:justify-between md:items-end mb-20 gap-8">
          <div>
            <h2 className="text-5xl md:text-7xl font-display font-black tracking-tighter uppercase leading-none">
              Oportunidades<br/>a Precio de Particular
            </h2>
          </div>
          <Link to="/catalogo" className="flex items-center gap-2 text-lg font-bold uppercase tracking-widest border-b-4 border-black pb-2 hover:text-[#e11d48] hover:border-[#e11d48] transition-colors">
            Ver colección <ChevronRight size={24} />
          </Link>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Tarjeta de ejemplo principal */}
          <FadeIn>
            <div className="group block h-full flex flex-col bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-all overflow-hidden relative">
              <div className="absolute top-4 right-4 bg-[#e11d48] text-white font-black uppercase text-xs px-4 py-2 rotate-3 z-10 border-2 border-black">
                ¡Precio de Remate!
              </div>
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative border-b-4 border-black">
                <img 
                  src={pageSettings.homePromoImage} 
                  alt="Audi SQ5" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-3xl font-display font-black tracking-tight uppercase leading-none mb-4">Audi SQ5 2019</h3>
                <p className="text-gray-500 font-bold tracking-widest text-xs uppercase mb-6 flex-1">Motor V6T • Tracción Quattro • Techo Panorámico.</p>
                <div className="mt-auto">
                  <div className="mb-4">
                    <p className="text-gray-400 line-through font-bold tracking-widest inline-block mr-3">$560,000</p>
                    <p className="text-4xl text-[#e11d48] font-display font-black tracking-tighter inline-block">$499,000</p>
                  </div>
                  <Link to="/catalogo" className="block w-full text-center bg-black text-white font-display font-black uppercase py-4 border-4 border-black hover:bg-white hover:text-black transition-colors">
                    Ver Detalles
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Render first 2 real cars from inventory alongside */}
          {recentCars.slice(0, 2).map((car, idx) => (
            <FadeIn key={car.id} delay={(idx + 1) * 0.1}>
              <div className="group block h-full flex flex-col bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-all overflow-hidden relative">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative border-b-4 border-black">
                  <img 
                    src={car.images[0]} 
                    alt={car.model} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-3xl font-display font-black tracking-tight uppercase leading-none mb-4">{car.brand} {car.model} {car.year}</h3>
                  <p className="text-gray-500 font-bold tracking-widest text-xs uppercase mb-6 flex-1">{car.mileage.toLocaleString()} KM • {car.transmission} • {car.bodyType}</p>
                  <div className="mt-auto">
                    <div className="mb-4">
                      <p className="text-4xl text-black font-display font-black tracking-tighter inline-block">${car.price.toLocaleString()}</p>
                    </div>
                    <Link to={`/auto/${car.id}`} className="block w-full text-center bg-white text-black font-display font-black uppercase py-4 border-4 border-black hover:bg-black hover:text-white transition-colors">
                      Ver Detalles
                    </Link>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Por qué Nextcar (Autoridad) */}
      <section className="bg-black py-40 px-6 border-y-8 border-[#e11d48]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <FadeIn className="md:w-1/2">
            <h2 className="text-5xl md:text-8xl font-display font-black tracking-tighter text-white uppercase leading-none mb-8">
              No adivinamos,<br/> <span className="text-[#e11d48]">verificamos.</span>
            </h2>
            <p className="text-gray-300 font-bold uppercase tracking-widest text-lg leading-relaxed mb-12">
              Comprar un auto usado no debería ser un volado. Por eso creamos un sistema donde cada vehículo que entra a nuestras instalaciones pasa por una revisión minuciosa. Filtramos lo que sirve de lo que no.
            </p>
            <ul className="space-y-6">
              {[
                "Trámites vehiculares transparentes",
                "Estética automotriz premium",
                "Asesoría financiera"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 text-white font-display font-black text-xl uppercase tracking-tight">
                  <span className="text-3xl">✅</span> {item}
                </li>
              ))}
            </ul>
          </FadeIn>
          <FadeIn delay={0.2} className="md:w-1/2 w-full">
            <div className="relative">
              <div className="absolute inset-0 bg-[#e11d48] rotate-6 border-4 border-black hidden md:block"></div>
              <img 
                src={pageSettings.homeVerificationImage} 
                alt="Verificación mecánica" 
                className="relative z-10 w-full h-[600px] object-cover border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
};

const Catalog = ({ cars, loading }: { cars: CarData[], loading: boolean }) => {
  const [filterBrand, setFilterBrand] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const brands = useMemo(() => Array.from(new Set(cars.map(c => c.brand))), [cars]);
  const types = useMemo(() => Array.from(new Set(cars.map(c => c.bodyType))), [cars]);

  const filteredCars = useMemo(() => {
    let result = [...cars];
    if (filterBrand) result = result.filter(c => c.brand === filterBrand);
    if (filterType) result = result.filter(c => c.bodyType === filterType);
    
    if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    if (sortBy === 'newest') result.sort((a, b) => b.year - a.year);

    return result;
  }, [cars, filterBrand, filterType, sortBy]);

  return (
    <div className="pt-40 pb-20 px-6 max-w-7xl mx-auto bg-[#fafafa]">
      <FadeIn className="mb-16">
        <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter uppercase leading-none mb-4">Catálogo</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest">Encuentra tu próximo auto con el estilo radical que mereces.</p>
      </FadeIn>

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Filters Panel */}
        <aside className="lg:w-64 space-y-8">
          <FadeIn>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-black mb-3 block">Marca</label>
                <select 
                  value={filterBrand} 
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="w-full bg-white border-4 border-black p-4 text-sm font-bold uppercase focus:ring-0 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer appearance-none rounded-none"
                >
                  <option value="">Todas las marcas</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-black mb-3 block">Carrocería</label>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-white border-4 border-black p-4 text-sm font-bold uppercase focus:ring-0 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer appearance-none rounded-none"
                >
                  <option value="">Todos los tipos</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-black mb-3 block">Ordenar por</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-white border-4 border-black p-4 text-sm font-bold uppercase focus:ring-0 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer appearance-none rounded-none"
                >
                  <option value="newest">Más recientes</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                </select>
              </div>

              {(filterBrand || filterType) && (
                <button 
                  onClick={() => { setFilterBrand(''); setFilterType(''); }}
                  className="text-xs font-bold text-white bg-black px-4 py-2 uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center gap-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
                >
                  <X size={14} /> Limpiar filtros
                </button>
              )}
            </div>
          </FadeIn>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredCars.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredCars.map((car, idx) => (
                <FadeIn key={car.id} delay={idx * 0.05}>
                  <Link to={`/auto/${car.id}`} className="group block">
                    <ParallaxImage 
                      src={car.images[0]} 
                      alt={car.model} 
                      className="aspect-[4/5] bg-gray-100 mb-6 border-4 border-black"
                    />
                    {car.status === 'sold' && (
                      <div className="absolute top-4 right-4 z-10 bg-red-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        Vendido
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-display font-black tracking-tight uppercase leading-none">{car.brand} <br/>{car.model}</h3>
                        <p className="text-gray-500 font-bold tracking-widest mt-2">{car.year} • {car.mileage.toLocaleString()} KM</p>
                      </div>
                      <p className="text-2xl font-display font-black tracking-tighter">${car.price.toLocaleString()}</p>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <Car size={64} className="mx-auto text-black mb-6" />
              <h3 className="text-4xl font-display font-black tracking-tighter uppercase">No hay resultados</h3>
              <p className="text-gray-500 mt-4 font-bold uppercase tracking-widest">Intenta ajustar tus filtros de búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CarDetail = ({ allCars }: { allCars: CarData[] }) => {
  const { id } = useParams();
  const [car, setCar] = useState<CarData | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '' });
  const [submittingLead, setSubmittingLead] = useState(false);

  useEffect(() => {
    if (!id) return;
    const rawBase = (import.meta as any).env.VITE_HOSTINGER_API_URL || 'https://nextcar.erewere.com/hostinger-api/';
    const apiBaseUrl = rawBase.endsWith('/') ? rawBase : rawBase + '/';
    
    // Support both string and number IDs (MySQL uses numbers, Firestore uses strings)
    const found = allCars.find(c => String(c.id) === id);
    if (found) {
      setCar(found);
      setLoading(false);
    } else if (apiBaseUrl) {
      const fetchCar = async () => {
        try {
          const resp = await fetch(`${apiBaseUrl}get-auto.php?id=${id}`);
          if (resp.ok) {
            const result = await resp.json();
            if (result.success) {
              setCar(result.data);
            }
          }
          setLoading(false);
        } catch (error) {
          console.error("Error fetching car from Hostinger:", error);
          setLoading(false);
        }
      };
      fetchCar();
    } else {
      // Fallback to Firestore OR demo data only if Hostinger API is NOT configured
      const fetchCarFromFirestore = async () => {
        const path = `cars/${id}`;
        try {
          const docRef = doc(db, 'cars', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCar({ id: docSnap.id, ...docSnap.data() } as CarData);
          }
          setLoading(false);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      };
      fetchCar();
    }
  }, [id, allCars]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!car) return;
    setSubmittingLead(true);
    
    try {
      const leadData = {
        ...leadForm,
        carId: car.id,
        carName: `${car.brand} ${car.model} ${car.year}`,
        createdAt: serverTimestamp()
      };

      // Save to Firestore
      await addDoc(collection(db, 'leads'), leadData);

      // Prepare Mailto
      const subject = encodeURIComponent(`Interés en ${car.brand} ${car.model} ${car.year}`);
      const body = encodeURIComponent(
        `Hola,\n\nHe recibido un nuevo prospecto interesado en el siguiente auto:\n\n` +
        `Auto: ${car.brand} ${car.model} ${car.year}\n` +
        `Precio: $${car.price.toLocaleString()}\n\n` +
        `Datos del interesado:\n` +
        `Nombre: ${leadForm.name}\n` +
        `Teléfono: ${leadForm.phone}\n` +
        `Correo: ${leadForm.email}\n\n` +
        `Este mensaje fue generado automáticamente desde NEXTCAR.`
      );
      
      window.location.href = `mailto:findnextcar@gmail.com?subject=${subject}&body=${body}`;
      
      alert('¡Gracias! Tus datos han sido registrados. Se abrirá tu correo para enviar la solicitud.');
      setShowLeadModal(false);
      setLeadForm({ name: '', phone: '', email: '' });
    } catch (error) {
      console.error(error);
      alert('Hubo un error al procesar tu solicitud.');
    }
    setSubmittingLead(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;
  if (!car) return <div className="h-screen flex items-center justify-center">Auto no encontrado</div>;

  const whatsappUrl = `https://wa.me/525566164275?text=${encodeURIComponent(`Hola, estoy interesado en el ${car.brand} ${car.model} ${car.year} que vi en NEXTCAR.`)}`;

  return (
    <div className="pt-40 pb-20 px-6 max-w-7xl mx-auto bg-[#fafafa]">
      {/* Lead Modal */}
      <AnimatePresence>
        {showLeadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLeadModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md p-10 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              <button onClick={() => setShowLeadModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black">
                <X size={32} />
              </button>
              <h3 className="text-4xl font-display font-black tracking-tighter uppercase mb-4">Me interesa</h3>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-8 leading-relaxed">Déjanos tus datos y te contactaremos a la brevedad para el {car.brand} {car.model}.</p>
              
              <form onSubmit={handleLeadSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black mb-2 block">Nombre Completo</label>
                  <input 
                    required value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                    className="w-full bg-white border-2 border-black p-4 text-sm font-bold uppercase focus:ring-0 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-gray-300"
                    placeholder="Escribe tu nombre"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black mb-2 block">Teléfono</label>
                  <input 
                    required type="tel" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                    className="w-full bg-white border-2 border-black p-4 text-sm font-bold uppercase focus:ring-0 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-gray-300"
                    placeholder="Tu mejor número"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black mb-2 block">Correo Electrónico</label>
                  <input 
                    required type="email" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                    className="w-full bg-white border-2 border-black p-4 text-sm font-bold uppercase focus:ring-0 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-gray-300"
                    placeholder="Donde contactarte"
                  />
                </div>
                <button 
                  type="submit" disabled={submittingLead}
                  className="w-full bg-[#111] text-white py-5 font-display font-black text-xl uppercase tracking-widest hover:bg-[#e11d48] transition-all disabled:opacity-50 mt-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                >
                  {submittingLead ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="md:hidden mb-12">
        <p className="text-sm font-bold uppercase tracking-widest text-[#e11d48] mb-2">{car.brand}</p>
        <h1 className="text-6xl font-display font-black tracking-tighter uppercase leading-none mb-4">{car.model} <br/>{car.year}</h1>
        <p className="text-4xl font-display font-black tracking-tighter">${car.price.toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Gallery */}
        <div className="lg:col-span-8 space-y-12">
          <FadeIn>
            <div className="aspect-[16/9] border-4 border-black bg-gray-100 relative group overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <motion.img 
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1 }}
                src={car.images[activeImage]} 
                alt={car.model} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {car.status === 'sold' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                  <span className="bg-red-500 text-white text-5xl font-display font-black uppercase tracking-tighter px-10 py-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-[-5deg]">Vendido</span>
                </div>
              )}
              {car.images.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImage(prev => prev === 0 ? car.images.length - 1 : prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-[#e11d48] text-white border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-50%] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] opacity-0 group-hover:opacity-100 transition-all font-bold"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <button 
                    onClick={() => setActiveImage(prev => prev === car.images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-[#e11d48] text-white border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-50%] hover:translate-x-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] opacity-0 group-hover:opacity-100 transition-all font-bold"
                  >
                    <ChevronRight size={32} />
                  </button>
                </>
              )}
            </div>
            <div className="grid grid-cols-5 md:grid-cols-8 gap-4 mt-6">
              {car.images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    "aspect-square overflow-hidden border-4 transition-all",
                    activeImage === idx ? "border-[#e11d48] shadow-[4px_4px_0px_0px_rgba(225,29,72,1)]" : "border-black opacity-60 hover:opacity-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </FadeIn>

          {/* Details Sections */}
          <div className="space-y-20 pt-16 border-t-8 border-black">
            <FadeIn>
              <h2 className="text-5xl font-display font-black tracking-tighter uppercase mb-8">Sobre este auto</h2>
              <p className="font-bold text-gray-800 leading-relaxed text-xl">{car.description}</p>
            </FadeIn>

            <FadeIn>
              <h2 className="text-3xl font-display font-black tracking-tighter uppercase mb-8">Lo que nos encanta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {car.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <CheckCircle2 className="text-[#3b82f6] shrink-0 mt-1" size={24} />
                    <span className="font-bold text-lg uppercase tracking-wider">{h}</span>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn>
              <h2 className="text-3xl font-display font-black tracking-tighter uppercase mb-8">Equipamiento</h2>
              <div className="flex flex-wrap gap-4">
                {car.features.map((f, i) => (
                  <span key={i} className="bg-black text-white px-6 py-3 font-bold uppercase tracking-widest text-sm border-2 border-transparent">
                    {f}
                  </span>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="lg:col-span-4 space-y-12">
          <FadeIn className="hidden md:block">
            <p className="text-sm font-bold uppercase tracking-widest text-[#e11d48] mb-4">{car.brand}</p>
            <h1 className="text-6xl lg:text-7xl font-display font-black tracking-tighter mb-6 uppercase leading-none">{car.model} <br/>{car.year}</h1>
            <p className="text-5xl font-display font-black tracking-tighter mb-12">${car.price.toLocaleString()}</p>
          </FadeIn>

          <FadeIn>
            <div className="grid grid-cols-2 gap-6 mb-12">
              {[
                { label: "Kilometraje", value: `${car.mileage.toLocaleString()} km` },
                { label: "Transmisión", value: car.transmission },
                { label: "Carrocería", value: car.bodyType },
                { label: "Pasajeros", value: car.passengers },
                { label: "Motor", value: car.engineType || 'N/D' },
                { label: "Potencia", value: car.horsepower || 'N/D' },
                { label: "Consumo Promedio", value: car.fuelConsumption || 'N/D' }
              ].map((spec, i) => (
                <div key={i} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#3b82f6] mb-1">{spec.label}</p>
                  <p className="font-bold text-lg uppercase">{spec.value}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn>
            {car.status === 'sold' ? (
              <div className="w-full bg-[#e11d48] text-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] py-6 font-display font-black uppercase text-2xl text-center mb-6">
                Vehículo Vendido
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setShowLeadModal(true)}
                  className="w-full bg-black text-white border-4 border-black py-6 font-display font-black uppercase text-2xl hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-4 mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                >
                  Me interesa <ArrowRight size={28} />
                </button>
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] text-black border-4 border-black py-6 font-display font-black uppercase text-2xl hover:bg-white transition-colors flex items-center justify-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                >
                  WhatsApp <Smartphone size={28} />
                </a>
              </>
            )}
          </FadeIn>

          <FadeIn>
            <FinancialCalculator price={car.price} />
          </FadeIn>
        </aside>
      </div>
    </div>
  );
};

const Vender = ({ pageSettings }: { pageSettings?: any }) => {
  const [form, setForm] = useState({
    year: '',
    brand: '',
    model: '',
    km: '',
    name: '',
    phone: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Hola Nextcar, me interesa una *Oferta Inmediata* por mi auto.\n\n🚗 *Vehículo:* ${form.year} ${form.brand} ${form.model}\n🛣️ *Kilometraje:* ${form.km} km\n👤 *Nombre:* ${form.name}\n📧 *Correo:* ${form.email}\n📱 *Teléfono:* ${form.phone}`;
    window.open(`https://wa.me/525566164275?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="pt-24 bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="relative h-[60vh] flex items-center justify-center text-center px-6">
        {pageSettings?.venderImage && (
          <div className="absolute inset-0 z-0">
            <img src={pageSettings.venderImage} alt="Vender Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        )}
        <FadeIn className="relative z-10 max-w-4xl mx-auto">
          <h1 className={cn("text-5xl md:text-7xl font-display font-black uppercase tracking-tighter mb-6 leading-none", pageSettings?.venderImage ? "text-white" : "text-black")}>
            Recibe una oferta por tu auto hoy mismo.
          </h1>
          <p className={cn("text-lg md:text-xl font-bold uppercase tracking-widest leading-relaxed", pageSettings?.venderImage ? "text-gray-200" : "text-gray-600")}>
            Dinero rápido, trámite transparente y sin arriesgarte en la calle. Déjanos tus datos y te damos una pre-valuación rápida.
          </p>
        </FadeIn>
      </section>

      {/* Formulario */}
      <section className="py-24 px-6 max-w-2xl mx-auto">
        <FadeIn delay={0.2}>
          <div className="bg-white p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
            <form className="space-y-8" onSubmit={handleSubmit}>
              
              <div className="space-y-6">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter border-b-4 border-black pb-2">Vehículo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>📅</span> Año</label>
                    <select className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold appearance-none bg-white" required value={form.year} onChange={e => setForm({...form, year: e.target.value})}>
                      <option value="">Selecciona</option>
                      {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>🚘</span> Marca</label>
                    <input type="text" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Ej. Nissan" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>🏎️</span> Modelo y Versión</label>
                    <input type="text" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Ej. Versa Advance" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter border-b-4 border-black pb-2">Estado</h3>
                <div>
                  <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>🛣️</span> Kilometraje aproximado</label>
                  <input type="number" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Ej. 50000" value={form.km} onChange={e => setForm({...form, km: e.target.value})} />
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter border-b-4 border-black pb-2">Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>👤</span> Nombre</label>
                    <input type="text" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Tu nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>📧</span> Correo Electrónico</label>
                    <input type="email" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="tu@correo.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>📱</span> WhatsApp</label>
                    <input type="tel" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="10 dígitos" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button type="submit" className="w-full bg-black text-white font-display font-black uppercase tracking-widest text-xl py-6 hover:bg-[#e11d48] transition-colors border-4 border-transparent hover:border-black shadow-[4px_4px_0px_0px_rgba(225,29,72,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                  ⚡ Solicitar Oferta Inmediata
                </button>
              </div>

            </form>
          </div>
        </FadeIn>
      </section>
    </div>
  );
};

const Consignacion = ({ pageSettings }: { pageSettings?: any }) => {
  const [form, setForm] = useState({
    year: '',
    brand: '',
    model: '',
    price: '',
    name: '',
    phone: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Hola Nextcar, me interesa dejar mi auto a *Consignación*.\n\n🚗 *Vehículo:* ${form.year} ${form.brand} ${form.model}\n💲 *Espero recibir:* $${form.price}\n👤 *Nombre:* ${form.name}\n📧 *Correo:* ${form.email}\n📱 *Teléfono:* ${form.phone}`;
    window.open(`https://wa.me/525566164275?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="pt-24 bg-white min-h-screen flex flex-col">
      {/* Hero */}
      <section className="bg-black pt-24 pb-20 px-6 text-center border-b-8 border-[#e11d48] relative z-10 overflow-hidden">
        {pageSettings?.consignacionImage && (
          <div className="absolute inset-0 z-0">
            <img src={pageSettings.consignacionImage} alt="Consignación Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70" />
          </div>
        )}
        <div className="max-w-5xl mx-auto relative z-10">
          <FadeIn>
            <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-6 leading-none">
              Vende al precio justo de mercado <span className="text-[#e11d48]">sin mover un dedo.</span>
            </h1>
            <p className="text-gray-300 text-lg md:text-xl font-bold uppercase tracking-widest leading-relaxed max-w-3xl mx-auto">
              Tú pones el auto, nosotros hacemos el trabajo pesado. Nos encargamos de la estética, la promoción, el blindaje legal y de mostrarlo a compradores perfilados.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Info Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FadeIn delay={0.1} className="h-full">
            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center h-full">
              <span className="text-4xl mb-4">⚙️</span>
              <h3 className="font-display font-black text-xl uppercase tracking-tighter mb-4">Inspección 120 puntos</h3>
              <p className="text-gray-600 font-bold text-sm tracking-widest uppercase flex-1">Revisamos tu auto para garantizar calidad.</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.2} className="h-full">
            <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center h-full">
              <span className="text-4xl mb-4">💰</span>
              <h3 className="font-display font-black text-xl uppercase tracking-tighter mb-4">Fijamos el precio</h3>
              <p className="text-gray-600 font-bold text-sm tracking-widest uppercase flex-1">Acordamos un precio de mercado justo para ti.</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.3} className="h-full">
            <div className="bg-white p-8 border-4 border-[#e11d48] shadow-[8px_8px_0px_0px_rgba(225,29,72,1)] flex flex-col items-center text-center h-full">
              <span className="text-4xl mb-4">🤝</span>
              <h3 className="font-display font-black text-xl uppercase tracking-tighter text-[#e11d48] mb-4">Venta Segura</h3>
              <p className="text-gray-600 font-bold text-sm tracking-widest uppercase flex-1">Lo publicamos y gestionamos los trámites sin riesgo.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Formulario */}
      <section className="pb-24 px-6 max-w-2xl mx-auto w-full">
        <FadeIn delay={0.4}>
          <div className="bg-white p-8 md:p-12 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <form className="space-y-8" onSubmit={handleSubmit}>
              
              <div className="space-y-6">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter border-b-4 border-black pb-2">Datos del Vehículo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>📅</span> Año</label>
                    <input type="number" min="2000" max={new Date().getFullYear() + 1} className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Ej. 2019" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>🚘</span> Marca</label>
                    <input type="text" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Ej. Audi" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>🏎️</span> Modelo</label>
                    <input type="text" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Ej. SQ5" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter border-b-4 border-black pb-2">Expectativa</h3>
                <div>
                  <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>💲</span> ¿Cuánto esperas recibir por tu auto?</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">$</span>
                    <input type="number" className="w-full border-2 border-black p-4 pl-8 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Monto estimado" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter border-b-4 border-black pb-2">Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>👤</span> Nombre</label>
                    <input type="text" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="Tu nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>📧</span> Correo Electrónico</label>
                    <input type="email" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="tu@correo.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2 flex items-center gap-2"><span>📱</span> WhatsApp</label>
                    <input type="tel" className="w-full border-2 border-black p-4 focus:outline-none focus:ring-0 focus:border-[#e11d48] transition-colors font-bold" required placeholder="10 dígitos" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button type="submit" className="w-full bg-[#e11d48] text-white font-display font-black uppercase tracking-widest text-xl py-6 hover:bg-black transition-colors border-4 border-transparent hover:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                  🤝 Agendar Cita de Inspección
                </button>
              </div>

            </form>
          </div>
        </FadeIn>
      </section>
    </div>
  );
};

const Admin = ({ onCarAdded, onCarUpdated, onCarDeleted, allCars, pageSettings, fetchCars }: { 
  onCarAdded: (car: CarData) => void,
  onCarUpdated: (car: CarData) => void,
  onCarDeleted: (id: string) => void,
  allCars: CarData[],
  pageSettings: any,
  fetchCars: () => Promise<void>
}) => {
  const rawBase = (import.meta as any).env.VITE_HOSTINGER_API_URL || 'https://nextcar.erewere.com/hostinger-api/';
  const apiBaseUrl = rawBase.endsWith('/') ? rawBase : rawBase + '/';
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsDemoMode(false);
      } else {
        setUser(null);
      }
      setInitialLoad(false);
    });
    return () => unsubscribe();
  }, []);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'leads' | 'settings'>('inventory');
  const [leads, setLeads] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    brand: '', model: '', year: 2024, price: 0, mileage: 0,
    bodyType: 'Sedán', transmission: 'Automática', engineType: '', horsepower: '', fuelConsumption: '', passengers: 5,
    description: '', highlights: '', features: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAutoFillWithAI = async () => {
    if (!formData.brand || !formData.model) {
      alert("Por favor ingresa al menos la marca y el modelo para que la IA pueda ayudarte.");
      return;
    }
    setAiLoading(true);
    try {
      const resp = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: formData.brand,
          model: formData.model,
          year: formData.year
        })
      });
      if (!resp.ok) {
        throw new Error('API error');
      }
      const data = await resp.json();

      setFormData(prev => ({
        ...prev,
        bodyType: data.bodyType || prev.bodyType,
        transmission: data.transmission || prev.transmission,
        engineType: data.engineType || prev.engineType,
        horsepower: data.horsepower || prev.horsepower,
        fuelConsumption: data.fuelConsumption || prev.fuelConsumption,
        highlights: data.highlights || prev.highlights,
        features: data.features || prev.features,
        description: data.description || prev.description,
      }));
    } catch (error) {
      console.error(error);
      alert("Hubo un error al autocompletar con IA.");
    }
    setAiLoading(false);
  };

  useEffect(() => {
    if (user && !isDemoMode) {
      const unsubscribe = onSnapshot(collection(db, 'leads'), (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeads(leadsData.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
      });
      return () => unsubscribe();
    }
  }, [user, isDemoMode]);

  const startEditing = (car: CarData) => {
    setEditingId(car.id || null);
    setFormData({
      brand: car.brand,
      model: car.model,
      year: car.year,
      price: car.price,
      mileage: car.mileage,
      bodyType: car.bodyType,
      transmission: car.transmission,
      engineType: car.engineType || '',
      horsepower: car.horsepower || '',
      fuelConsumption: car.fuelConsumption || '',
      passengers: car.passengers,
      description: car.description,
      highlights: car.highlights.join(', '),
      features: car.features.join(', ')
    });
    setExistingImages(car.images);
    setSelectedFiles([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({
      brand: '', model: '', year: 2024, price: 0, mileage: 0,
      bodyType: 'Sedán', transmission: 'Automática', engineType: '', horsepower: '', fuelConsumption: '', passengers: 5,
      description: '', highlights: '', features: ''
    });
    setExistingImages([]);
    setSelectedFiles([]);
  };

  const handleDelete = async (car: CarData) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el ${car.brand} ${car.model}?`)) return;
    
    try {
      if (isDemoMode || car.id?.startsWith('demo-') || car.id?.startsWith('seed-')) {
        onCarDeleted(car.id!);
        alert('Auto eliminado localmente');
      } else if (apiBaseUrl) {
        const resp = await fetch(`${apiBaseUrl}delete-auto.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: car.id })
        });
        const result = await resp.json();
        if (result.success) {
          alert('Auto eliminado con éxito');
          fetchCars();
        } else {
          throw new Error(result.message || 'Error al eliminar en Hostinger');
        }
      } else {
        await deleteDoc(doc(db, 'cars', car.id!));
      }
    } catch (err) {
      alert("Error: " + (err as any).message);
    }
  };

  const handleToggleSold = async (car: CarData) => {
    try {
      const newStatus = car.status === 'sold' ? 'available' : 'sold';
      if (isDemoMode || car.id?.startsWith('demo-') || car.id?.startsWith('seed-')) {
        onCarUpdated({...car, status: newStatus});
        alert(`Auto marcado como ${newStatus === 'sold' ? 'Vendido' : 'Disponible'} localmente`);
      } else if (apiBaseUrl) {
        const formDataPayload = new FormData();
        formDataPayload.append('id', car.id!);
        formDataPayload.append('status', newStatus);
        
        // We need to send all other fields too because update-auto.php expects them (naive implementation)
        // Or we could modify update-auto.php to be partial. 
        // For now let's just send the status update to update-auto.php
        // Actually, update-auto.php as written requires many fields. 
        // I'll use a simpler fetch for status if possible, or just build the full formData.
        
        Object.keys(car).forEach(key => {
          if (key === 'status') {
            formDataPayload.append(key, newStatus);
          } else if (key === 'images' || key === 'highlights' || key === 'features') {
            const val = (car as any)[key];
            formDataPayload.append(key === 'images' ? 'keep_images[]' : key, Array.isArray(val) ? val.join(',') : val);
          } else if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
            formDataPayload.append(key, String((car as any)[key]));
          }
        });

        const resp = await fetch(`${apiBaseUrl}update-auto.php`, {
          method: 'POST',
          body: formDataPayload
        });
        const result = await resp.json();
        if (result.success) {
          alert(`Auto marcado como ${newStatus === 'sold' ? 'Vendido' : 'Disponible'}`);
          fetchCars();
        } else {
          throw new Error(result.message || 'Error al actualizar estado');
        }
      } else {
        await updateDoc(doc(db, 'cars', car.id!), { status: newStatus });
      }
    } catch (err) {
      alert("Error: " + (err as any).message);
    }
  };

  const handleAuth = async (e: React.FormEvent, forceRegister = false) => {
    if (e) e.preventDefault();
    
    if (!password) {
      setError('Por favor, ingresa una contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let result;
      if (forceRegister) {
        try {
          result = await createUserWithEmailAndPassword(auth, email, password);
          alert('Cuenta creada con éxito.');
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
             // Try logging in instead if the account exists
             result = await signInWithEmailAndPassword(auth, email, password);
          } else {
             throw createErr;
          }
        }
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('El inicio de sesión con correo y contraseña no está habilitado en Firebase. Por favor habilítalo en la consola de Firebase en Autenticación > Sign-in method.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales incorrectas. Verifica tu contraseña o usa "Olvidé mi contraseña". Si antes entrabas con Google, necesitas restablecer tu contraseña.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Esta cuenta ya existe. Por favor, inicia sesión normalmente.');
      } else {
        setError(err.message || 'Error de acceso. Verifica la configuración de Firebase.');
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo para restablecer la contraseña.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Se ha enviado un enlace para restablecer la contraseña a tu correo.');
    } catch (err: any) {
      console.error(err);
      setError(`Error al enviar el enlace de recuperación: ${err.message}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files].slice(0, 20));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveExistingImage = (index: number, direction: 'left' | 'right') => {
    setExistingImages(prev => {
      const newImages = [...prev];
      if (direction === 'left' && index > 0) {
        [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      } else if (direction === 'right' && index < prev.length - 1) {
        [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
      }
      return newImages;
    });
  };

  const moveSelectedFile = (index: number, direction: 'left' | 'right') => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      if (direction === 'left' && index > 0) {
        [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      } else if (direction === 'right' && index < prev.length - 1) {
        [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
      }
      return newFiles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 && existingImages.length === 0) return alert('Sube al menos una imagen');
    
    setUploading(true);
    try {
      if (isDemoMode || (editingId && (editingId.startsWith('demo-') || editingId.startsWith('seed-')))) {
        // Simulate success in demo mode
        const imageUrls = [...existingImages];
        // Note: In a real app we'd upload these, but for demo we'll just use object URLs
        for (const file of selectedFiles) {
          imageUrls.push(URL.createObjectURL(file));
        }

        const carData: CarData = {
          ...formData,
          id: editingId || `demo-${Date.now()}`,
          price: Number(formData.price),
          year: Number(formData.year),
          mileage: Number(formData.mileage),
          passengers: Number(formData.passengers),
          images: imageUrls,
          highlights: formData.highlights.split(',').map(s => s.trim()).filter(s => s !== ''),
          features: formData.features.split(',').map(s => s.trim()).filter(s => s !== ''),
        };
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (editingId) {
          onCarUpdated(carData);
          alert('MODO DEMO: Auto actualizado localmente');
        } else {
          onCarAdded(carData);
          alert('MODO DEMO: Auto publicado localmente');
        }
      } else if (apiBaseUrl) {
        // Hostinger submission
        const formDataPayload = new FormData();
        if (editingId) formDataPayload.append('id', editingId);
        
        Object.keys(formData).forEach(key => {
          const val = (formData as any)[key];
          formDataPayload.append(key, val);
        });

        // Add existing images to keep
        existingImages.forEach(img => {
          formDataPayload.append('keep_images[]', img);
        });

        // Add new files
        selectedFiles.forEach(file => {
          formDataPayload.append('images[]', file);
        });

        const endpoint = editingId ? 'update-auto.php' : 'upload.php';
        const resp = await fetch(`${apiBaseUrl}${endpoint}`, {
          method: 'POST',
          body: formDataPayload
        });

        let resultData;
        try {
          resultData = await resp.json();
        } catch (e) {
          const text = await resp.text();
          throw new Error('Respuesta no válida del servidor: ' + text.substring(0, 100));
        }

        if (!resp.ok) {
          throw new Error(resultData.message || 'Error en el servidor Hostinger');
        }

        if (resultData.success) {
          alert(editingId ? 'Auto actualizado con éxito' : 'Auto publicado con éxito');
          fetchCars();
        } else {
          throw new Error(resultData.message || 'Error al guardar en Hostinger');
        }
      } else {
        // Fallback a Firestore si Hostinger no está configurado
        const imageUrls = [...existingImages];
        for (const file of selectedFiles) {
          const storageRef = ref(storage, `cars/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          imageUrls.push(url);
        }

        const carData: CarData = {
          ...formData,
          price: Number(formData.price),
          year: Number(formData.year),
          mileage: Number(formData.mileage),
          passengers: Number(formData.passengers),
          images: imageUrls,
          highlights: formData.highlights.split(',').map(s => s.trim()).filter(s => s !== ''),
          features: formData.features.split(',').map(s => s.trim()).filter(s => s !== ''),
          status: (editingId && allCars.find(c => c.id === editingId)?.status) || 'available',
        };

        if (editingId) {
          await updateDoc(doc(db, 'cars', editingId), { ...carData, updatedAt: serverTimestamp() });
          alert('Auto actualizado con éxito en Firestore');
        } else {
          await addDoc(collection(db, 'cars'), { ...carData, createdAt: serverTimestamp() });
          alert('Auto publicado con éxito en Firestore');
        }
      }

      cancelEditing();
      } catch (err: any) {
      console.error(err);
      try {
        handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.WRITE, editingId ? `cars/${editingId}` : 'cars');
      } catch (e: any) {
        try {
          const parsed = JSON.parse(e.message);
          alert(`Error al guardar el auto: ${parsed.error} (URL: ${apiBaseUrl})`);
        } catch (_) {
          alert(`Error al guardar el auto: ${(e.message || err.message || err)} (URL: ${apiBaseUrl})`);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  if (initialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e11d48]"></div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
        <FadeIn className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
          <h2 className="text-3xl font-bold tracking-tighter mb-2 text-center">Admin Access</h2>
          <p className="text-gray-500 text-center mb-8">Gestiona el inventario de Nextcar.</p>
          
          <div className="space-y-4">
            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg">{error}</p>}
            
            <form onSubmit={(e) => handleAuth(e, false)} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-black mb-2 block">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-white border-2 border-black p-4 focus:ring-0 focus:outline-none focus:border-[#e11d48] transition-all font-bold" 
                  placeholder="admin@nextcar.com" 
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-black mb-2 block">Contraseña</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-white border-2 border-black p-4 focus:ring-0 focus:outline-none focus:border-[#e11d48] transition-all font-bold" 
                  placeholder="••••••••" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-black text-white font-bold uppercase tracking-widest text-sm py-4 border-4 border-black hover:bg-transparent hover:text-black transition-all"
              >
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
              </button>
            </form>

            <button 
              type="button" 
              onClick={(e) => handleAuth(e as any, true)} 
              disabled={loading}
              className="w-full text-center text-xs text-black font-bold uppercase tracking-widest underline decoration-2 underline-offset-4 pt-4 pb-4"
            >
              Crear cuenta de Administrador
            </button>

            <button 
              type="button" 
              onClick={handleResetPassword} 
              disabled={loading}
              className="w-full text-center text-xs text-black font-bold uppercase tracking-widest underline decoration-2 underline-offset-4"
            >
              Olvidé mi contraseña
            </button>

          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-20 px-6 max-w-7xl mx-auto bg-[#fafafa]">
      <FadeIn className="flex justify-between items-end mb-16">
        <div>
          <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter uppercase leading-none">Panel de<br/>Control</h1>
          <div className="flex gap-8 mt-8 border-b-4 border-black pb-0">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={cn("text-lg font-bold uppercase tracking-widest pb-4 transition-all border-b-4 -mb-[4px]", activeTab === 'inventory' ? "border-[#e11d48] text-black" : "border-transparent text-gray-400 hover:text-black")}
            >
              Inventario
            </button>
            <button 
              onClick={() => setActiveTab('leads')}
              className={cn("text-lg font-bold uppercase tracking-widest pb-4 transition-all border-b-4 -mb-[4px]", activeTab === 'leads' ? "border-[#e11d48] text-black" : "border-transparent text-gray-400 hover:text-black")}
            >
              Prospectos ({leads.length})
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn("text-lg font-bold uppercase tracking-widest pb-4 transition-all border-b-4 -mb-[4px]", activeTab === 'settings' ? "border-[#e11d48] text-black" : "border-transparent text-gray-400 hover:text-black")}
            >
              Ajustes de Página
            </button>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 text-sm font-bold bg-black text-white px-6 py-3 uppercase tracking-widest hover:bg-[#e11d48] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none"
        >
          <LogOut size={18} /> Salir
        </button>
      </FadeIn>

      {activeTab === 'inventory' && (
        <div className="space-y-24">
          {/* Form Section */}
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <FadeIn>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-3xl font-display font-black uppercase tracking-tighter">{editingId ? 'Editar Unidad' : 'Nueva Unidad'}</h3>
                        <div className="mt-2 flex gap-2">
                          {!apiBaseUrl && !isDemoMode && (
                            <span className="text-[9px] font-bold bg-yellow-400 px-2 py-0.5 border-2 border-black uppercase">
                              Modo Firebase
                            </span>
                          )}
                          {apiBaseUrl && (
                            <span className="text-[9px] font-bold bg-green-400 px-2 py-0.5 border-2 border-black uppercase">
                              Hostinger API
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleAutoFillWithAI}
                        disabled={aiLoading}
                        className="bg-[#3b82f6] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:-translate-x-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Bot size={16} />
                        {aiLoading ? 'Calculando...' : 'Completar con IA'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] mb-1 block">Marca</label>
                        <input required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] mb-1 block">Modelo</label>
                        <input required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] mb-1 block">Año</label>
                        <input type="number" required value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] mb-1 block">Precio ($)</label>
                        <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] mb-1 block">Kilometraje</label>
                        <input type="number" required value={formData.mileage} onChange={e => setFormData({...formData, mileage: Number(e.target.value)})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" />
                      </div>
                    </div>
                  </FadeIn>

                  <FadeIn>
                    <h3 className="text-3xl font-display font-black uppercase tracking-tighter mb-6">Especificaciones</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black mb-1 block">Carrocería</label>
                        <select value={formData.bodyType} onChange={e => setFormData({...formData, bodyType: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none appearance-none rounded-none">
                          <option>Sedán</option><option>SUV</option><option>Hatchback</option><option>Pick-up</option><option>Coupé</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black mb-1 block">Transmisión</label>
                        <input required value={formData.transmission} onChange={e => setFormData({...formData, transmission: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black mb-1 block">Tipo de Motor</label>
                        <input value={formData.engineType} onChange={e => setFormData({...formData, engineType: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" placeholder="Ej: 4 cilindros 2.0L" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black mb-1 block">Caballos de Fuerza</label>
                        <input value={formData.horsepower} onChange={e => setFormData({...formData, horsepower: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" placeholder="Ej: 150 hp" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black mb-1 block">Consumo Promedio</label>
                        <input value={formData.fuelConsumption} onChange={e => setFormData({...formData, fuelConsumption: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" placeholder="Ej: 15 km/l" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] mb-1 block">Descripción</label>
                        <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all h-32" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] mb-1 block">Lo que nos encanta (separado por comas)</label>
                        <input value={formData.highlights} onChange={e => setFormData({...formData, highlights: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" placeholder="Ej: Bajo consumo, Único dueño..." />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] mb-1 block">Equipamiento (separado por comas)</label>
                        <input value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} className="w-full bg-white border-2 border-black p-4 text-sm font-bold focus:outline-none transition-all" placeholder="Ej: Apple CarPlay, Techo panorámico..." />
                      </div>
                    </div>
                  </FadeIn>
                </div>

                <div className="space-y-6">
                  <FadeIn>
                    <h3 className="text-3xl font-display font-black uppercase tracking-tighter mb-6">Imágenes</h3>
                    
                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {existingImages.map((img, i) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden relative group">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-1">
                              <button 
                                type="button" 
                                onClick={() => moveExistingImage(i, 'left')}
                                className={cn("bg-white/80 p-1 rounded-full text-black hover:bg-white", i === 0 && "invisible")}
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => moveExistingImage(i, 'right')}
                                className={cn("bg-white/80 p-1 rounded-full text-black hover:bg-white", i === existingImages.length - 1 && "invisible")}
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div 
                      className="border-4 border-dashed border-black bg-white p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        if (e.dataTransfer.files) {
                          const files = Array.from(e.dataTransfer.files);
                          setSelectedFiles(prev => [...prev, ...files].slice(0, 20));
                        }
                      }}
                    >
                      <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <Upload size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-xs font-bold">Nuevas fotos</p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden relative group bg-gray-100">
                          <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-1">
                              <button 
                                type="button" 
                                onClick={() => moveSelectedFile(i, 'left')}
                                className={cn("bg-white/80 p-1 rounded-full text-black hover:bg-white", i === 0 && "invisible")}
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => moveSelectedFile(i, 'right')}
                                className={cn("bg-white/80 p-1 rounded-full text-black hover:bg-white", i === selectedFiles.length - 1 && "invisible")}
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          <button 
                            type="button"
                            onClick={() => removeFile(i)}
                            className="absolute top-1 right-1 bg-white/80 backdrop-blur p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </FadeIn>

                  <div className="pt-12 space-y-4">
                    <button 
                      type="submit" disabled={uploading}
                      className="w-full bg-[#111] text-white py-5 font-display font-black text-xl uppercase tracking-widest hover:bg-[#e11d48] transition-all disabled:opacity-50 flex items-center justify-center gap-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                    >
                      {uploading ? 'Procesando...' : editingId ? 'Guardar Cambios' : 'Publicar Auto'} 
                      {editingId ? <CheckCircle2 size={24} /> : <Plus size={24} />}
                    </button>
                    {editingId && (
                      <button 
                        type="button"
                        onClick={cancelEditing}
                        className="w-full bg-white text-black border-4 border-black py-4 font-display font-black text-xl hover:bg-gray-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none uppercase"
                      >
                        Cancelar Edición
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* List Section */}
          <div className="space-y-8">
            <FadeIn>
              <h3 className="text-4xl font-display font-black uppercase tracking-tighter mb-8">Inventario Actual ({allCars.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCars.map(car => (
                  <div key={car.id} className={cn(
                    "flex gap-4 p-4 border-4 transition-all group",
                    editingId === car.id ? "border-[#e11d48] bg-white shadow-[4px_4px_0px_0px_rgba(225,29,72,1)]" : "border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                    car.status === 'sold' && "opacity-80 border-gray-400 shadow-[4px_4px_0px_0px_rgba(156,163,175,1)]"
                  )}>
                    <div className="w-24 h-24 border-2 border-black overflow-hidden bg-gray-100 shrink-0 relative">
                      <img src={car.images[0]} alt="" className="w-full h-full object-cover" />
                      {car.status === 'sold' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-red-500 px-2 py-1 rotate-[-5deg] border-2 border-black">Vendido</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-display font-black text-lg truncate uppercase">{car.brand} {car.model}</h4>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{car.year} • ${car.price.toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <button 
                          onClick={() => startEditing(car)}
                          className="text-[10px] font-bold uppercase tracking-widest text-black hover:text-[#3b82f6]"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleToggleSold(car)}
                          className={cn("text-[10px] font-bold uppercase tracking-widest", car.status === 'sold' ? "text-green-600 hover:text-green-800" : "text-[#e11d48] hover:text-red-700")}
                        >
                          {car.status === 'sold' ? "Marcar Disponible" : "Marcar Vendido"}
                        </button>
                        <button 
                          onClick={() => handleDelete(car)}
                          className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      )}
      {activeTab === 'leads' && (
        <div className="grid grid-cols-1 gap-8">
          <FadeIn>
            <h3 className="text-3xl font-display font-black uppercase tracking-tighter mb-6">Prospectos Recibidos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {leads.length > 0 ? leads.map((lead: any) => (
                <div key={lead.id} className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#3b82f6] text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 border-2 border-black">Nuevo</div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{lead.createdAt?.toDate().toLocaleDateString()}</p>
                  </div>
                  <h4 className="text-2xl font-display font-black uppercase tracking-tighter mb-1">{lead.name}</h4>
                  <p className="text-sm font-bold uppercase tracking-widest text-[#e11d48] mb-6">{lead.carName}</p>
                  <div className="space-y-3 pt-4 border-t-2 border-black">
                    <div className="flex items-center gap-3 text-xs">
                      <Smartphone size={16} className="text-black" />
                      <span className="font-bold uppercase tracking-wider">{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <Search size={16} className="text-black" />
                      <span className="font-bold uppercase tracking-wider truncate">{lead.email}</span>
                    </div>
                  </div>
                  <div className="mt-8 flex gap-4">
                    <a 
                      href={`tel:${lead.phone}`}
                      className="flex-1 bg-white border-2 border-black text-black text-center py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      Llamar
                    </a>
                    <a 
                      href={`mailto:${lead.email}`}
                      className="flex-1 bg-black text-white text-center py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#e11d48] transition-all border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      Email
                    </a>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-32 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <Info size={64} className="mx-auto text-black mb-6" />
                  <p className="text-2xl font-display font-black tracking-tighter uppercase text-gray-500">Aún no hay prospectos registrados.</p>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12">
          <FadeIn>
            <h3 className="text-3xl font-display font-black uppercase tracking-tighter mb-6">Ajustes de Imágenes de Página</h3>
            <p className="text-gray-600 mb-8 font-bold uppercase tracking-widest text-sm">Sube las imágenes desde tu computadora para personalizar cada sección.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {[
                { key: 'homeHeroImage', label: 'Inicio - Hero (Fondo Principal)' },
                { key: 'homePromoImage', label: 'Inicio - Auto Promoción' },
                { key: 'homeVerificationImage', label: 'Inicio - Foto Verificación Mecánica' },
                { key: 'venderImage', label: 'Vender - Hero (Fondo)' },
                { key: 'consignacionImage', label: 'Consignación - Hero (Fondo)' },
                { key: 'nosotrosImage', label: 'Nosotros - Hero (Fondo)' },
              ].map((setting) => (
                <div key={setting.key} className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-black mb-2 block border-b-2 border-black pb-2">{setting.label}</label>
                  
                  <div className="aspect-[4/3] border-4 border-black bg-gray-100 relative group overflow-hidden">
                    {pageSettings?.[setting.key] ? (
                      <img src={pageSettings[setting.key]} alt={setting.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-400 font-bold uppercase tracking-widest">Sin Imagen</div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white text-black px-4 py-2 font-bold uppercase tracking-widest text-xs border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                        {uploading ? 'Subiendo...' : 'Cambiar Foto'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          disabled={uploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (isDemoMode) {
                              alert('Modo demo: los cambios no se guardarán.');
                              return;
                            }
                            setUploading(true);
                            try {
                              const storageRef = ref(storage, `settings/${setting.key}_${Date.now()}_${file.name}`);
                              const snapshot = await uploadBytes(storageRef, file);
                              const url = await getDownloadURL(snapshot.ref);
                              
                              await setDoc(doc(db, 'settings', 'pages'), { [setting.key]: url }, { merge: true });
                              alert('Imagen actualizada correctamente.');
                            } catch (error: any) {
                              alert('Error al subir la imagen: ' + error.message);
                            }
                            setUploading(false);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
};

// --- Nosotros Page ---
const Nosotros = ({ pageSettings }: { pageSettings?: any }) => {
  return (
    <div className="pt-24 bg-white">
      {/* 1. Sección Hero (Fondo oscuro bg-nextcarDark p.ej. bg-[#111] o bg-black) */}
      <section className="bg-black text-white py-24 px-6 md:py-32 relative overflow-hidden">
        {pageSettings?.nosotrosImage && (
          <div className="absolute inset-0 z-0">
            <img src={pageSettings.nosotrosImage} alt="Nosotros Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70" />
          </div>
        )}
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <FadeIn>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black tracking-tighter uppercase mb-6 leading-tight">
              Redefiniendo <br className="hidden md:block" /> la compra y venta de seminuevos en el Bajío.
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 font-medium">
              Nacimos con una convicción clara: cambiar de auto no debería ser un deporte de riesgo ni un proceso donde pierdas dinero.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* 2. Sección "Nuestra Historia" */}
      <section className="py-24 px-6 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tighter uppercase mb-12 text-black">
              De la experiencia,<br/> a la innovación.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <p className="text-xl leading-relaxed text-gray-800 font-medium">
                El mercado tradicional te obliga a elegir entre dos extremos: malbaratar tu vehículo en una agencia a cambio de rapidez, o arriesgar tu seguridad y tu patrimonio intentando venderlo por tu cuenta en redes sociales.
              </p>
              <p className="text-xl leading-relaxed text-gray-800 font-medium">
                Con más de 15 años de experiencia profesional en la industria automotriz y en la valuación de vehículos, sabíamos que tenía que existir un punto medio. Así nació Nextcar: el puente seguro que conecta a particulares, garantizando el precio justo de mercado con la infraestructura de una agencia premium.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 3. Sección "El Factor Nextcar" */}
      <section className="py-24 px-6 md:py-32 bg-gray-50 border-y-4 border-black">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter uppercase mb-16 text-center text-black">
              El Factor Nextcar.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="text-5xl mb-6">🛠️</div>
                <h3 className="text-2xl font-bold uppercase tracking-tight mb-4">Diagnóstico de 120 puntos</h3>
                <p className="text-gray-700 leading-relaxed font-medium">Cada auto es sometido a un escrutinio mecánico y estético riguroso antes de exhibirse.</p>
              </div>
              {/* Card 2 */}
              <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="text-5xl mb-6">⚖️</div>
                <h3 className="text-2xl font-bold uppercase tracking-tight mb-4">Blindaje Legal</h3>
                <p className="text-gray-700 leading-relaxed font-medium">Revisamos el historial completo para garantizar un patrimonio limpio y sin adeudos.</p>
              </div>
              {/* Card 3 */}
              <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="text-5xl mb-6">📈</div>
                <h3 className="text-2xl font-bold uppercase tracking-tight mb-4">Valuación Justa</h3>
                <p className="text-gray-700 leading-relaxed font-medium">Usamos datos reales para que quien vende gane más, y quien compra pague lo correcto.</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 4. Sección Cierre */}
      <section className="py-24 px-6 md:py-32 bg-white">
        <div className="max-w-4xl mx-auto text-center border-4 border-black p-8 md:p-16 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <FadeIn delay={0.2}>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter uppercase mb-6 text-black">
              Tu tranquilidad es <br className="hidden md:block"/> nuestro motor.
            </h2>
            <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium mb-12">
              Estamos orgullosos de operar desde Celaya y elevar el estándar de calidad para nuestros clientes. Ya sea que busques el auto de tus sueños o necesites liquidez inmediata, aquí tienes a un socio comercial de confianza.
            </p>
            <p className="text-2xl md:text-3xl font-black italic text-[#e11d48]">
              - Luis Felipe, Fundador
            </p>
          </FadeIn>
        </div>
      </section>
    </div>
  );
};

// --- Main App ---

const defaultSettings = {
  homeHeroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2000&auto=format&fit=crop',
  homePromoImage: 'https://images.unsplash.com/photo-1549314486-13d80db18c2b?q=80&w=800&auto=format&fit=crop',
  homeVerificationImage: 'https://images.unsplash.com/photo-1542282088-72c9c2d2ed40?q=80&w=1000&auto=format&fit=crop',
  venderImage: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=1000&auto=format&fit=crop',
  consignacionImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1000&auto=format&fit=crop',
  nosotrosImage: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1000&auto=format&fit=crop'
};

export default function App() {
  const [firestoreCars, setFirestoreCars] = useState<CarData[]>([]);
  const rawBase = (import.meta as any).env.VITE_HOSTINGER_API_URL || 'https://nextcar.erewere.com/hostinger-api/';
  const apiBaseUrl = rawBase.endsWith('/') ? rawBase : rawBase + '/';

  const fetchCars = async () => {
    if (!apiBaseUrl) return;
    try {
      const resp = await fetch(`${apiBaseUrl}list-autos.php`);
      if (resp.ok) {
        const result = await resp.json();
        if (result.success) {
          setFirestoreCars(result.data);
        }
      }
    } catch (err) {
      console.error("Error fetching cars from Hostinger:", err);
    } finally {
      setLoading(false);
    }
  };
  const [demoCars, setDemoCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSettings, setPageSettings] = useState(defaultSettings);

  // Initialize Lenis for smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
    return () => lenis.destroy();
  }, []);

  // Load Demo Cars from SessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('nextcar_demo_units');
    if (saved) {
      setDemoCars(JSON.parse(saved));
    }
  }, []);

  // Sync Firestore Settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'pages'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setPageSettings(prev => ({ ...prev, ...data }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync with Hostinger/Firebase
  useEffect(() => {
    if (apiBaseUrl) {
      fetchCars();
      // Optional: Polling every 30 seconds for "real-time" feel
      const interval = setInterval(fetchCars, 30000);
      return () => clearInterval(interval);
    } else {
      const unsubscribe = onSnapshot(collection(db, 'cars'), (snapshot) => {
        const cars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarData));
        setFirestoreCars(cars);
        setLoading(false);
      }, (error) => {
        console.warn("Firestore access restricted or not ready. Using local data.");
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [apiBaseUrl]);

  // Merge Data: Final logic for display
  const allCars = useMemo(() => {
    // CRITICAL: If Hostinger is active, ONLY use its data
    // This disables demo and seed data when the API URL is present
    if (apiBaseUrl) return firestoreCars;
    
    const validDemo = demoCars.filter((c: any) => c.status !== 'deleted');
    const uniqueMap = new Map();
    // First take firestore cars
    firestoreCars.forEach((c: any) => uniqueMap.set(c.id, c));
    // Then add demo cars only if they don't share the same ID
    validDemo.forEach((c: any) => {
      if (!uniqueMap.has(c.id)) uniqueMap.set(c.id, c);
    });
    
    let combined = Array.from(uniqueMap.values());
    
    // Fallback to seed cars ONLY if no firestore cars exist and not in Hostinger mode
    if (firestoreCars.length === 0) {
      const demoIds = new Set(demoCars.map((c: any) => c.id));
      const remainingSeeds = seedCars.map((c, i) => ({ ...c, id: `seed-${i}` })).filter(c => !demoIds.has(c.id));
      combined = [...combined, ...remainingSeeds];
    }
    
    return combined;
  }, [firestoreCars, demoCars, apiBaseUrl]);

  // Seed Logic: Only trigger if NOT using Hostinger
  useEffect(() => {
    const checkAndSeed = async () => {
      if (apiBaseUrl) return; // PROHIBIT seeding in Hostinger mode
      try {
        const snapshot = await getDocs(collection(db, 'cars'));
        if (snapshot.empty && auth.currentUser) {
          for (const car of seedCars) {
            await addDoc(collection(db, 'cars'), { ...car, createdAt: serverTimestamp() });
          }
        }
      } catch (e) { /* Ignore */ }
    };
    checkAndSeed();
  }, [apiBaseUrl, auth.currentUser]);

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home cars={allCars} pageSettings={pageSettings} />} />
              <Route path="/catalogo" element={<Catalog cars={allCars} loading={loading} />} />
              <Route path="/vender" element={<Vender pageSettings={pageSettings} />} />
              <Route path="/consignacion" element={<Consignacion pageSettings={pageSettings} />} />
              <Route path="/nosotros" element={<Nosotros pageSettings={pageSettings} />} />
              <Route path="/auto/:id" element={<CarDetail allCars={allCars} />} />
              <Route path="/admin" element={<Admin 
                allCars={allCars}
                pageSettings={pageSettings}
                fetchCars={fetchCars}
                onCarAdded={(newCar: CarData) => {
                  const updated = [newCar, ...demoCars];
                  setDemoCars(updated);
                  sessionStorage.setItem('nextcar_demo_units', JSON.stringify(updated));
                }} 
                onCarUpdated={(updatedCar: CarData) => {
                  let updated = demoCars.map(c => c.id === updatedCar.id ? updatedCar : c);
                  if (!demoCars.some(c => c.id === updatedCar.id)) {
                    updated = [updatedCar, ...demoCars];
                  }
                  setDemoCars(updated);
                  sessionStorage.setItem('nextcar_demo_units', JSON.stringify(updated));
                }}
                onCarDeleted={(id: string) => {
                  let updated = demoCars.filter(c => c.id !== id);
                  if (!demoCars.some(c => c.id === id) && id.startsWith('seed-')) {
                    // It's a seed car we haven't modified yet. We need a way to mark it hidden.
                    // Easiest is to add a flag to demoCars
                    updated = [{...seedCars[parseInt(id.split('-')[1])], id, status: 'deleted' as any}, ...demoCars];
                  }
                  setDemoCars(updated);
                  sessionStorage.setItem('nextcar_demo_units', JSON.stringify(updated));
                }}
              />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}
