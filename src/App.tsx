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
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
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
  passengers: number;
  description: string;
  images: string[];
  features: string[];
  highlights: string[];
  createdAt?: any;
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
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
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
      scrolled ? "bg-white/80 backdrop-blur-md border-gray-200 py-4" : "bg-transparent border-transparent py-6"
    )}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-tighter text-black">NEXTCAR</Link>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/" className={cn("text-sm font-medium hover:text-gray-500 transition-colors", pathname === '/' ? "text-black" : "text-gray-600")}>Inicio</Link>
          <Link to="/catalogo" className={cn("text-sm font-medium hover:text-gray-500 transition-colors", pathname === '/catalogo' ? "text-black" : "text-gray-600")}>Catálogo</Link>
          <Link to="/admin" className={cn("text-sm font-medium hover:text-gray-500 transition-colors", pathname === '/admin' ? "text-black" : "text-gray-600")}>Admin</Link>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-black" onClick={() => setIsOpen(!isOpen)}>
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
            className="md:hidden bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="flex flex-col p-6 space-y-4">
              <Link to="/" onClick={() => setIsOpen(false)} className="text-lg font-medium">Inicio</Link>
              <Link to="/catalogo" onClick={() => setIsOpen(false)} className="text-lg font-medium">Catálogo</Link>
              <Link to="/admin" onClick={() => setIsOpen(false)} className="text-lg font-medium">Admin</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-black text-white py-20 px-6">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="space-y-4">
        <h3 className="text-2xl font-bold tracking-tighter">NEXTCAR</h3>
        <p className="text-gray-400 text-sm max-w-xs">La nueva forma de comprar tu próximo auto. Experiencia premium, digital y transparente.</p>
      </div>
      <div>
        <h4 className="font-bold mb-4">Explora</h4>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li><Link to="/catalogo">Catálogo</Link></li>
          <li><Link to="/">Recién llegados</Link></li>
          <li><Link to="/">Financiamiento</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold mb-4">Compañía</h4>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>Sobre nosotros</li>
          <li>Contacto</li>
          <li>Privacidad</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold mb-4">Contacto</h4>
        <p className="text-gray-400 text-sm">Av. Insurgentes Sur 1234<br />Ciudad de México, CP 03100</p>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-gray-800 text-gray-500 text-xs text-center">
      © 2026 NEXTCAR. Todos los derechos reservados.
    </div>
  </footer>
);

const FinancialCalculator: React.FC<{ price: number }> = ({ price }) => {
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [months, setMonths] = useState(48);
  const annualInterest = 0.14;

  const monthlyPayment = useMemo(() => {
    const downPayment = price * (downPaymentPercent / 100);
    const loanAmount = price - downPayment;
    const monthlyInterest = annualInterest / 12;
    const payment = (loanAmount * monthlyInterest * Math.pow(1 + monthlyInterest, months)) / (Math.pow(1 + monthlyInterest, months) - 1);
    return Math.round(payment);
  }, [price, downPaymentPercent, months]);

  return (
    <div className="bg-gray-50 p-8 rounded-2xl space-y-6">
      <h3 className="text-xl font-bold tracking-tight">Cotizador Financiero</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Enganche ({downPaymentPercent}%)</span>
            <span className="font-bold">${(price * (downPaymentPercent / 100)).toLocaleString()}</span>
          </div>
          <input 
            type="range" min="10" max="80" step="5" 
            value={downPaymentPercent} 
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Plazo ({months} meses)</span>
            <span className="font-bold">{months} meses</span>
          </div>
          <div className="flex gap-2">
            {[12, 24, 36, 48, 60].map(m => (
              <button 
                key={m}
                onClick={() => setMonths(m)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg border transition-all",
                  months === m ? "bg-black text-white border-black" : "bg-white text-black border-gray-200 hover:border-black"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Mensualidad estimada</p>
        <p className="text-4xl font-bold tracking-tighter">${monthlyPayment.toLocaleString()}</p>
        <p className="text-[10px] text-gray-400 mt-2">*Sujeto a aprobación de crédito. Tasa del 14% anual fija.</p>
      </div>
    </div>
  );
};

// --- Views ---

const Home = ({ cars }: { cars: CarData[] }) => {
  const recentCars = useMemo(() => cars.slice(0, 3), [cars]);

  return (
    <div className="pt-0">
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2000&auto=format&fit=crop" 
            alt="Hero Car" 
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 text-center px-6">
          <FadeIn>
            <h1 className="text-5xl md:text-8xl font-bold text-white tracking-tighter mb-6">
              EL PRÓXIMO<br />ES TUYO.
            </h1>
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light">
              Descubre nuestra selección curada de autos seminuevos con certificación premium.
            </p>
            <Link to="/catalogo" className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-gray-200 transition-all">
              Explorar Catálogo <ArrowRight size={20} />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Recent Arrivals */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <FadeIn className="flex justify-between items-end mb-16">
          <div>
            <h2 className="text-4xl font-bold tracking-tighter">Recién llegados</h2>
            <p className="text-gray-500 mt-2">Las últimas adiciones a nuestro inventario.</p>
          </div>
          <Link to="/catalogo" className="hidden md:flex items-center gap-2 text-sm font-bold border-b-2 border-black pb-1">
            Ver todo <ChevronRight size={16} />
          </Link>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recentCars.length > 0 ? recentCars.map((car, idx) => (
            <FadeIn key={car.id} delay={idx * 0.1}>
              <Link to={`/auto/${car.id}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 mb-6">
                  <img 
                    src={car.images[0]} 
                    alt={car.model} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{car.brand} {car.model}</h3>
                    <p className="text-gray-500 text-sm">{car.year} • {car.mileage.toLocaleString()} km</p>
                  </div>
                  <p className="text-xl font-bold">${car.price.toLocaleString()}</p>
                </div>
              </Link>
            </FadeIn>
          )) : (
            <div className="col-span-3 text-center py-20 text-gray-400">Cargando unidades...</div>
          )}
        </div>
      </section>

      {/* Value Prop */}
      <section className="bg-gray-50 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-20">
            <h2 className="text-4xl font-bold tracking-tighter">La experiencia Nextcar</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Redefinimos la compra de autos usados con un enfoque en la calidad y la simplicidad.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: ShieldCheck, title: "Garantía Total", desc: "Todos nuestros autos pasan por una inspección de 150 puntos y cuentan con garantía mecánica." },
              { icon: CreditCard, title: "Financiamiento", desc: "Planes a tu medida con aprobación en minutos. Enganche desde el 10%." },
              { icon: Smartphone, title: "Compra Digital", desc: "Aparta tu auto desde casa. Entrega a domicilio disponible en toda la ciudad." }
            ].map((item, idx) => (
              <FadeIn key={idx} delay={idx * 0.1} className="text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <item.icon size={32} />
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </FadeIn>
            ))}
          </div>
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
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <FadeIn className="mb-12">
        <h1 className="text-5xl font-bold tracking-tighter mb-4">Catálogo</h1>
        <p className="text-gray-500">Encuentra el auto perfecto para tu estilo de vida.</p>
      </FadeIn>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Filters Panel */}
        <aside className="lg:w-64 space-y-8">
          <FadeIn>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 block">Marca</label>
                <select 
                  value={filterBrand} 
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-black"
                >
                  <option value="">Todas las marcas</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 block">Carrocería</label>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-black"
                >
                  <option value="">Todos los tipos</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 block">Ordenar por</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-black"
                >
                  <option value="newest">Más recientes</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                </select>
              </div>

              {(filterBrand || filterType) && (
                <button 
                  onClick={() => { setFilterBrand(''); setFilterType(''); }}
                  className="text-xs font-bold text-gray-500 hover:text-black transition-colors flex items-center gap-1"
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
                    <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 mb-6">
                      <img 
                        src={car.images[0]} 
                        alt={car.model} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">{car.brand} {car.model}</h3>
                        <p className="text-gray-500 text-sm">{car.year} • {car.mileage.toLocaleString()} km</p>
                      </div>
                      <p className="text-xl font-bold">${car.price.toLocaleString()}</p>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-gray-50 rounded-3xl">
              <Car size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold">No hay resultados</h3>
              <p className="text-gray-500 mt-2">Intenta ajustar tus filtros de búsqueda.</p>
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
    const found = allCars.find(c => c.id === id);
    if (found) {
      setCar(found);
      setLoading(false);
    } else {
      const fetchCar = async () => {
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
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      {/* Lead Modal */}
      <AnimatePresence>
        {showLeadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLeadModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <button onClick={() => setShowLeadModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black">
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold tracking-tighter mb-2">Me interesa este auto</h3>
              <p className="text-gray-500 text-sm mb-8">Déjanos tus datos y te contactaremos a la brevedad para el {car.brand} {car.model}.</p>
              
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Nombre Completo</label>
                  <input 
                    required value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-black"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Teléfono</label>
                  <input 
                    required type="tel" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-black"
                    placeholder="55 1234 5678"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Correo Electrónico</label>
                  <input 
                    required type="email" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-black"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
                <button 
                  type="submit" disabled={submittingLead}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 mt-4"
                >
                  {submittingLead ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="md:hidden mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{car.brand}</p>
        <h1 className="text-4xl font-bold tracking-tighter mb-2">{car.model} {car.year}</h1>
        <p className="text-3xl font-bold text-black">${car.price.toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Gallery */}
        <div className="lg:col-span-8 space-y-6">
          <FadeIn>
            <div className="aspect-[16/9] rounded-3xl overflow-hidden bg-gray-100 relative group">
              <img 
                src={car.images[activeImage]} 
                alt={car.model} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {car.images.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImage(prev => prev === 0 ? car.images.length - 1 : prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setActiveImage(prev => prev === car.images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
            <div className="grid grid-cols-5 md:grid-cols-8 gap-3 mt-4">
              {car.images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    "aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    activeImage === idx ? "border-black" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </FadeIn>

          {/* Details Sections */}
          <div className="space-y-16 pt-12">
            <FadeIn>
              <h2 className="text-2xl font-bold mb-6">Sobre este auto</h2>
              <p className="text-gray-600 leading-relaxed text-lg">{car.description}</p>
            </FadeIn>

            <FadeIn>
              <h2 className="text-2xl font-bold mb-6">Lo que nos encanta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {car.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 bg-green-50/50 p-4 rounded-xl">
                    <CheckCircle2 className="text-green-600" size={20} />
                    <span className="font-medium text-gray-800">{h}</span>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn>
              <h2 className="text-2xl font-bold mb-6">Equipamiento</h2>
              <div className="flex flex-wrap gap-2">
                {car.features.map((f, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="lg:col-span-4 space-y-8">
          <FadeIn className="hidden md:block">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{car.brand}</p>
            <h1 className="text-5xl font-bold tracking-tighter mb-4">{car.model} {car.year}</h1>
            <p className="text-4xl font-bold text-black mb-8">${car.price.toLocaleString()}</p>
          </FadeIn>

          <FadeIn>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: "Kilometraje", value: `${car.mileage.toLocaleString()} km` },
                { label: "Transmisión", value: car.transmission },
                { label: "Carrocería", value: car.bodyType },
                { label: "Pasajeros", value: car.passengers }
              ].map((spec, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{spec.label}</p>
                  <p className="font-bold text-sm">{spec.value}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn>
            <button 
              onClick={() => setShowLeadModal(true)}
              className="w-full bg-black text-white py-5 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-3 mb-4"
            >
              Me interesa este auto <ArrowRight size={20} />
            </button>
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white text-black border-2 border-black py-5 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
            >
              WhatsApp <Smartphone size={20} />
            </a>
          </FadeIn>

          <FadeIn>
            <FinancialCalculator price={car.price} />
          </FadeIn>
        </aside>
      </div>
    </div>
  );
};

const Admin = ({ onCarAdded, onCarUpdated, onCarDeleted, allCars }: { 
  onCarAdded: (car: CarData) => void,
  onCarUpdated: (car: CarData) => void,
  onCarDeleted: (id: string) => void,
  allCars: CarData[]
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'leads'>('inventory');
  const [leads, setLeads] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    brand: '', model: '', year: 2024, price: 0, mileage: 0,
    bodyType: 'Sedán', transmission: 'Automática', passengers: 5,
    description: '', highlights: '', features: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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
      bodyType: 'Sedán', transmission: 'Automática', passengers: 5,
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
      } else {
        await deleteDoc(doc(db, 'cars', car.id!));
        alert('Auto eliminado de la base de datos');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cars/${car.id}`);
    }
  };

  const handleAuth = async (e: React.FormEvent, forceRegister = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (forceRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Cuenta de Administrador Maestro creada con éxito.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setIsDemoMode(true);
        setUser({ email: 'demo@nextcar.com', uid: 'demo' } as User);
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales incorrectas. Si eres el dueño, verifica tu email.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Esta cuenta ya existe. Por favor, inicia sesión normalmente.');
      } else {
        setError('Error de acceso. Verifica la configuración de Firebase.');
      }
    }
    setLoading(false);
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
      } else {
        const imageUrls = [...existingImages];
        for (const file of selectedFiles) {
          const storageRef = ref(storage, `cars/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        }

        const carPayload = {
          ...formData,
          price: Number(formData.price),
          year: Number(formData.year),
          mileage: Number(formData.mileage),
          passengers: Number(formData.passengers),
          images: imageUrls,
          highlights: formData.highlights.split(',').map(s => s.trim()).filter(s => s !== ''),
          features: formData.features.split(',').map(s => s.trim()).filter(s => s !== ''),
          updatedAt: serverTimestamp()
        };

        if (editingId) {
          await updateDoc(doc(db, 'cars', editingId), carPayload);
          alert('Auto actualizado con éxito');
        } else {
          await addDoc(collection(db, 'cars'), {
            ...carPayload,
            createdAt: serverTimestamp()
          });
          alert('Auto publicado con éxito');
        }
      }

      cancelEditing();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.WRITE, editingId ? `cars/${editingId}` : 'cars');
    }
    setUploading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
        <FadeIn className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
          <h2 className="text-3xl font-bold tracking-tighter mb-2 text-center">Admin Access</h2>
          <p className="text-gray-500 text-center mb-8">Gestiona el inventario de Nextcar.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Email</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-black"
                placeholder="admin@nextcar.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Contraseña</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-black"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg">{error}</p>}
            
            <button 
              type="submit" disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Entrar al Panel'}
            </button>

            {/* Admin Bootstrap: Only visible for the owner's email */}
            {email.toLowerCase() === 'luisfj@gmail.com' && (
              <button 
                type="button"
                onClick={(e) => handleAuth(e as any, true)}
                className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all border border-blue-100"
              >
                Inicializar Administrador Maestro
              </button>
            )}

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">O prueba el sistema</span></div>
            </div>

            <button 
              type="button"
              onClick={() => {
                setIsDemoMode(true);
                setUser({ email: 'demo@nextcar.com', uid: 'demo' } as User);
              }}
              className="w-full bg-white text-black border border-gray-200 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              Entrar en Modo Demo
            </button>
          </form>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <FadeIn className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Panel de Control</h1>
          <div className="flex gap-6 mt-4">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={cn("text-sm font-bold pb-2 border-b-2 transition-all", activeTab === 'inventory' ? "border-black text-black" : "border-transparent text-gray-400")}
            >
              Inventario
            </button>
            <button 
              onClick={() => setActiveTab('leads')}
              className={cn("text-sm font-bold pb-2 border-b-2 transition-all", activeTab === 'leads' ? "border-black text-black" : "border-transparent text-gray-400")}
            >
              Prospectos ({leads.length})
            </button>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-700"
        >
          <LogOut size={18} /> Salir
        </button>
      </FadeIn>

      {activeTab === 'inventory' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <FadeIn>
                    <h3 className="text-xl font-bold mb-6">{editingId ? 'Editar Unidad' : 'Nueva Unidad'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Marca</label>
                        <input required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Modelo</label>
                        <input required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Año</label>
                        <input type="number" required value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Precio ($)</label>
                        <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Kilometraje</label>
                        <input type="number" required value={formData.mileage} onChange={e => setFormData({...formData, mileage: Number(e.target.value)})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" />
                      </div>
                    </div>
                  </FadeIn>

                  <FadeIn>
                    <h3 className="text-xl font-bold mb-6">Especificaciones</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Carrocería</label>
                        <select value={formData.bodyType} onChange={e => setFormData({...formData, bodyType: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm">
                          <option>Sedán</option><option>SUV</option><option>Hatchback</option><option>Pick-up</option><option>Coupé</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Transmisión</label>
                        <input required value={formData.transmission} onChange={e => setFormData({...formData, transmission: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Descripción</label>
                        <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm h-32" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Lo que nos encanta (separado por comas)</label>
                        <input value={formData.highlights} onChange={e => setFormData({...formData, highlights: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" placeholder="Ej: Bajo consumo, Único dueño..." />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Equipamiento (separado por comas)</label>
                        <input value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm" placeholder="Ej: Apple CarPlay, Techo panorámico..." />
                      </div>
                    </div>
                  </FadeIn>
                </div>

                <div className="space-y-6">
                  <FadeIn>
                    <h3 className="text-xl font-bold mb-6">Imágenes</h3>
                    
                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {existingImages.map((img, i) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden relative group">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div 
                      className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:border-black transition-colors cursor-pointer relative"
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
                          <button 
                            type="button"
                            onClick={() => removeFile(i)}
                            className="absolute top-1 right-1 bg-white/80 backdrop-blur p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </FadeIn>

                  <div className="pt-12 space-y-3">
                    <button 
                      type="submit" disabled={uploading}
                      className="w-full bg-black text-white py-5 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {uploading ? 'Procesando...' : editingId ? 'Guardar Cambios' : 'Publicar Auto'} 
                      {editingId ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                    </button>
                    {editingId && (
                      <button 
                        type="button"
                        onClick={cancelEditing}
                        className="w-full bg-white text-black border border-gray-200 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all"
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
              <h3 className="text-xl font-bold mb-6">Inventario Actual</h3>
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {allCars.map(car => (
                  <div key={car.id} className={cn(
                    "flex gap-4 p-4 rounded-2xl border transition-all group",
                    editingId === car.id ? "border-black bg-gray-50" : "border-gray-100 hover:border-gray-300"
                  )}>
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <img src={car.images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{car.brand} {car.model}</h4>
                      <p className="text-xs text-gray-500">{car.year} • ${car.price.toLocaleString()}</p>
                      <div className="flex gap-3 mt-2">
                        <button 
                          onClick={() => startEditing(car)}
                          className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(car)}
                          className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600"
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
      ) : (
        <div className="grid grid-cols-1 gap-8">
          <FadeIn>
            <h3 className="text-xl font-bold mb-6">Prospectos Recibidos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.length > 0 ? leads.map((lead: any) => (
                <div key={lead.id} className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Nuevo</div>
                    <p className="text-[10px] text-gray-400 font-bold">{lead.createdAt?.toDate().toLocaleDateString()}</p>
                  </div>
                  <h4 className="text-lg font-bold mb-1">{lead.name}</h4>
                  <p className="text-sm text-gray-500 mb-4">{lead.carName}</p>
                  <div className="space-y-2 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-xs">
                      <Smartphone size={14} className="text-gray-400" />
                      <span className="font-medium">{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Search size={14} className="text-gray-400" />
                      <span className="font-medium">{lead.email}</span>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <a 
                      href={`tel:${lead.phone}`}
                      className="flex-1 bg-gray-50 text-center py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
                    >
                      Llamar
                    </a>
                    <a 
                      href={`mailto:${lead.email}`}
                      className="flex-1 bg-black text-white text-center py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all"
                    >
                      Email
                    </a>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-20 bg-gray-50 rounded-3xl">
                  <Info size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">Aún no hay prospectos registrados.</p>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [firestoreCars, setFirestoreCars] = useState<CarData[]>([]);
  const [demoCars, setDemoCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Demo Cars from SessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('nextcar_demo_units');
    if (saved) {
      setDemoCars(JSON.parse(saved));
    }
  }, []);

  // Sync Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cars'), (snapshot) => {
      const cars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarData));
      setFirestoreCars(cars);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore access restricted or not ready. Using local data.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Merge Data: Firestore + Demo + Seed (if empty)
  const allCars = useMemo(() => {
    const combined = [...firestoreCars, ...demoCars];
    return combined.length > 0 ? combined : seedCars.map((c, i) => ({ ...c, id: `seed-${i}` }));
  }, [firestoreCars, demoCars]);

  // Seed Logic (Attempt only)
  useEffect(() => {
    const checkAndSeed = async () => {
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
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home cars={allCars} />} />
              <Route path="/catalogo" element={<Catalog cars={allCars} loading={loading} />} />
              <Route path="/auto/:id" element={<CarDetail allCars={allCars} />} />
              <Route path="/admin" element={<Admin 
                allCars={allCars}
                onCarAdded={(newCar: CarData) => {
                  const updated = [newCar, ...demoCars];
                  setDemoCars(updated);
                  sessionStorage.setItem('nextcar_demo_units', JSON.stringify(updated));
                }} 
                onCarUpdated={(updatedCar: CarData) => {
                  const updated = demoCars.map(c => c.id === updatedCar.id ? updatedCar : c);
                  setDemoCars(updated);
                  sessionStorage.setItem('nextcar_demo_units', JSON.stringify(updated));
                }}
                onCarDeleted={(id: string) => {
                  const updated = demoCars.filter(c => c.id !== id);
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
