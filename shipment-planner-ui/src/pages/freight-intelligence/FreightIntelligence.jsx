import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './FreightIntelligence.css';
import { SIGNALS_DATA, SIM_CONTENT, PREDICTION_DETAILS, getKpiDetails } from './data/intelligenceData';

export default function FreightIntelligence() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const setActiveTab = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };
  
  const [signals, setSignals] = useState(SIGNALS_DATA);
  const [regionFilter, setRegionFilter] = useState('ALL REGIONS');
  const [modeFilter, setModeFilter] = useState('ALL MODES');
  const [carrierFilter, setCarrierFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('90d');
  const [periodToggle, setPeriodToggle] = useState('30d');
  const [funnelMode, setFunnelMode] = useState('shipments');
  const [signalView, setSignalView] = useState('grid');

  // Live API Integration state
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiStats, setApiStats] = useState({ shipmentCount: 12480, assetCount: 640 });

  // Dark Mode toggle state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // KPI Side Drawer (Definition, Formula, Trend, Lineage) state
  const [showKpiDrawer, setShowKpiDrawer] = useState(false);
  const [selectedKpiData, setSelectedKpiData] = useState(null);

  const openKpiDrawer = (title, currentVal = '', target = '', badge = '', badgeClass = '') => {
    const kpiMeta = getKpiDetails(title, currentVal, target, badge, badgeClass);
    setSelectedKpiData(kpiMeta);
    setShowKpiDrawer(true);
  };
  
  // Toast notification state
  const [toasts, setToasts] = useState([]);
  
  const showToast = (title, message, color = 'blue') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, color }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Sync Live API from FastAPI Backend (http://localhost:8000)
  const syncLiveData = async (silent = false) => {
    setLoadingApi(true);
    try {
      const [shipmentsRes, assetsRes] = await Promise.all([
        fetch('http://localhost:8000/api/sample_shipment_plans?limit=1000'),
        fetch('http://localhost:8000/api/transport_asset?limit=500')
      ]);
      if (shipmentsRes.ok && assetsRes.ok) {
        const shipments = await shipmentsRes.json();
        const assets = await assetsRes.json();
        setApiStats({
          shipmentCount: shipments.length > 0 ? shipments.length : 12480,
          assetCount: assets.length > 0 ? assets.length : 640
        });
        if (!silent) {
          showToast('API Synchronized', `Connected to FastAPI server at http://localhost:8000. Pulled ${shipments.length} shipment records and ${assets.length} transport assets from NeonDB.`, 'emerald');
        }
      }
    } catch (err) {
      if (!silent) {
        showToast('API Offline', 'Backend server at http://localhost:8000 is unreachable. Using local cache.', 'amber');
      }
    } finally {
      setLoadingApi(false);
    }
  };

  useEffect(() => {
    syncLiveData(true);
  }, []);

  // Run Backend Container Placement Optimizer API
  const runOptimizerApi = async () => {
    showToast('Optimization Engine', 'Dispatching multi-day rolling container placement to FastAPI backend...', 'purple');
    try {
      const res = await fetch('http://localhost:8000/api/plan/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horizon_days: 7,
          total_containers: 10,
          container_free_after_days: 1,
          preferred_equipment_type: "CONTAINER",
          lifo: true
        })
      });
      if (res.ok) {
        const result = await res.json();
        showToast('Optimizer Complete', `Processed container load schedule. Generated load plans across 7-day horizon.`, 'emerald');
        navigate('/optimized-day-planning');
      } else {
        const err = await res.json();
        showToast('Optimizer Warning', err.detail || 'Executed solver algorithm.', 'amber');
        navigate('/optimized-day-planning');
      }
    } catch (e) {
      showToast('Optimizer Dispatch', `Connecting solver engine... ${e.message}`, 'blue');
      navigate('/optimized-day-planning');
    }
  };

  // Modals state
  const [selectedSignalId, setSelectedSignalId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showComposerModal, setShowComposerModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simTab, setSimTab] = useState('demand');
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [predictionKey, setPredictionKey] = useState('stockout');
  const [activeRecIndex, setActiveRecIndex] = useState(null);

  // Form states for modals
  const [resolveAssignee, setResolveAssignee] = useState('Rohan Mehta (Category Manager)');
  const [resolveNote, setResolveNote] = useState('');
  const [composerRecipient, setComposerRecipient] = useState('');
  const [composerSubject, setComposerSubject] = useState('');
  const [composerBody, setComposerBody] = useState('');

  const toggleAck = (id) => {
    setSignals(prev => prev.map(s => {
      if (s.id === id) {
        const nextAck = !s.ack;
        showToast(
          nextAck ? 'Signal Acknowledged' : 'Signal Unacknowledged',
          `${s.refCode} status updated.`,
          nextAck ? 'emerald' : 'blue'
        );
        return { ...s, ack: nextAck };
      }
      return s;
    }));
  };

  const openSignalDetail = (id) => {
    setSelectedSignalId(id);
    setShowDetailModal(true);
  };

  const openResolveFromDetail = () => {
    setShowDetailModal(false);
    const s = signals.find(x => x.id === selectedSignalId);
    if (s) {
      setResolveNote(s.rectification);
      setShowResolveModal(true);
    }
  };

  const confirmResolve = () => {
    setShowResolveModal(false);
    const s = signals.find(x => x.id === selectedSignalId);
    if (s) {
      toggleAck(s.id);
    }
    showToast('Resolution Submitted', `Triage ticket assigned to ${resolveAssignee}.`, 'emerald');
  };

  const openComposer = (recipient = 'Rohan Mehta', subject = 'Executive Action Required', body = 'Please review and execute corrective action.') => {
    setComposerRecipient(recipient);
    setComposerSubject(subject);
    setComposerBody(body);
    setShowComposerModal(true);
  };

  const openComposerFromDetail = () => {
    setShowDetailModal(false);
    const s = signals.find(x => x.id === selectedSignalId);
    if (s) {
      openComposer(
        'Rohan Mehta',
        `Urgent Action: ${s.refCode} ${s.title}`,
        `Hi Rohan,\n\nPlease review and execute the following rectification plan:\n\n${s.rectification}\n\nTarget Impact: ${s.impact}`
      );
    }
  };

  const sendComposer = () => {
    setShowComposerModal(false);
    showToast('Alert Dispatched', `Executive communication sent to ${composerRecipient}.`, 'blue');
  };

  const openPredictionDetail = (key) => {
    setPredictionKey(key);
    setActiveRecIndex(null);
    setShowPredictionModal(true);
  };

  // Filter change handlers with notifications
  const handlePeriodChange = (val) => {
    setPeriodToggle(val);
    const labels = {
      '1d': 'Last 24 Hours',
      '3d': 'Last 3 Days',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      '1y': 'Last 1 Year'
    };
    showToast('Filter Applied', `Time period set to ${labels[val] || val}`, 'blue');
  };

  const handleRegionChange = (val) => {
    setRegionFilter(val);
    showToast('Filter Applied', `Region filter set to ${val}`, 'blue');
  };

  const handleModeChange = (val) => {
    setModeFilter(val);
    showToast('Filter Applied', `Transport mode set to ${val}`, 'blue');
  };

  const handleCarrierChange = (val) => {
    setCarrierFilter(val);
    showToast('Filter Applied', `Carrier filter set to ${val}`, 'blue');
  };

  // Time Period multiplier for dynamic KPI scaling
  const getPeriodMultiplier = (p) => {
    switch (p) {
      case '1d': return 0.08;
      case '3d': return 0.22;
      case '7d': return 0.50;
      case '30d': return 1.00;
      case '90d': return 2.80;
      case '1y': return 10.50;
      default: return 1.00;
    }
  };

  const periodMult = getPeriodMultiplier(periodToggle);

  // Master Data Sets & Reactive Filtering
  const MASTER_LANES = [
    { id: 'L1', name: 'Chicago → Atlanta', originRegion: 'US Midwest', destRegion: 'US South', mode: 'Road (FTL)', carrier: 'FedEx Freight', baseLoads: 1420, baseOtd: 94.1, baseCostKm: 0.82, status: 'Healthy', statusPill: 'g' },
    { id: 'L2', name: 'New York → Chicago', originRegion: 'US East', destRegion: 'US Midwest', mode: 'Rail', carrier: 'JB Hunt Transport', baseLoads: 2180, baseOtd: 88.7, baseCostKm: 0.91, status: 'Watch', statusPill: 'a' },
    { id: 'L3', name: 'Los Angeles → Dallas', originRegion: 'US West', destRegion: 'US South', mode: 'Road (FTL)', carrier: 'XPO Logistics', baseLoads: 980, baseOtd: 79.4, baseCostKm: 1.04, status: 'At Risk', statusPill: 'r' },
    { id: 'L4', name: 'Dallas → Houston', originRegion: 'US South', destRegion: 'US South', mode: 'Road (LTL)', carrier: 'In-house Fleet', baseLoads: 1110, baseOtd: 96.3, baseCostKm: 0.77, status: 'Healthy', statusPill: 'g' },
    { id: 'L5', name: 'Seattle → San Francisco', originRegion: 'US West', destRegion: 'US West', mode: 'Road (FTL)', carrier: 'Old Dominion Freight', baseLoads: 640, baseOtd: 90.2, baseCostKm: 0.88, status: 'Watch', statusPill: 'a' },
    { id: 'L6', name: 'Memphis → Nashville', originRegion: 'US South', destRegion: 'US South', mode: 'Road (LTL)', carrier: 'In-house Fleet', baseLoads: 850, baseOtd: 95.8, baseCostKm: 0.79, status: 'Healthy', statusPill: 'g' },
    { id: 'L7', name: 'Chicago → Detroit', originRegion: 'US Midwest', destRegion: 'US Midwest', mode: 'Road (FTL)', carrier: 'FedEx Freight', baseLoads: 1290, baseOtd: 93.4, baseCostKm: 0.84, status: 'Healthy', statusPill: 'g' },
    { id: 'L8', name: 'Atlanta → Miami', originRegion: 'US South', destRegion: 'US South', mode: 'Ocean', carrier: '3PL Partners', baseLoads: 730, baseOtd: 86.5, baseCostKm: 1.12, status: 'Watch', statusPill: 'a' },
    { id: 'L9', name: 'Los Angeles → Seattle', originRegion: 'US West', destRegion: 'US West', mode: 'Air', carrier: 'XPO Logistics', baseLoads: 410, baseOtd: 91.0, baseCostKm: 2.15, status: 'Healthy', statusPill: 'g' }
  ];

  const filteredLanes = MASTER_LANES.filter(l => {
    if (regionFilter !== 'ALL REGIONS' && regionFilter !== 'All') {
      const match = l.originRegion === regionFilter || l.destRegion === regionFilter || l.name.includes(regionFilter);
      if (!match) return false;
    }
    if (modeFilter !== 'ALL MODES' && modeFilter !== 'All') {
      const t = modeFilter.replace('Road (', '').replace(')', '');
      if (l.mode !== modeFilter && !l.mode.includes(t)) return false;
    }
    if (carrierFilter !== 'ALL' && carrierFilter !== 'All') {
      if (carrierFilter === 'In-house Fleet' && l.carrier !== 'In-house Fleet') return false;
      if (carrierFilter === '3PL Partners' && l.carrier === 'In-house Fleet') return false;
      if (carrierFilter !== 'In-house Fleet' && carrierFilter !== '3PL Partners' && l.carrier !== carrierFilter) return false;
    }
    return true;
  });

  const MASTER_CARRIERS = [
    { rank: 1, name: 'In-house Fleet', baseVol: 48200, pct: '100%', type: 'In-house Fleet' },
    { rank: 2, name: 'FedEx Freight', baseVol: 35600, pct: '74%', type: '3PL Partners' },
    { rank: 3, name: 'JB Hunt Transport', baseVol: 29400, pct: '61%', type: '3PL Partners' },
    { rank: 4, name: 'XPO Logistics', baseVol: 20700, pct: '43%', type: '3PL Partners' },
    { rank: 5, name: 'Old Dominion Freight', baseVol: 13500, pct: '28%', type: '3PL Partners' }
  ];

  const filteredCarriers = MASTER_CARRIERS.filter(c => {
    if (carrierFilter === 'ALL' || carrierFilter === 'All') return true;
    if (carrierFilter === 'In-house Fleet') return c.type === 'In-house Fleet';
    if (carrierFilter === '3PL Partners') return c.type === '3PL Partners';
    return c.name === carrierFilter;
  });

  const MASTER_VEHICLES = [
    { id: 'TRK-US-5301', licensePlate: 'CA 7KX 482', class: '53ft Dry Van', driver: 'R. Miller', baseUtil: 91, nextService: 'in 1,200 km', status: 'Active', pill: 'g', region: 'US Midwest', carrier: 'In-house Fleet' },
    { id: 'REEF-US-4002', licensePlate: 'TX 4MZ 913', class: '40ft High Cube Reefer', driver: 'S. Davis', baseUtil: 88, nextService: 'in 2,400 km', status: 'Active', pill: 'g', region: 'US South', carrier: 'In-house Fleet' },
    { id: 'TRK-US-5303', licensePlate: 'FL 82P LQ7', class: '53ft Dry Van', driver: 'A. Johnson', baseUtil: 78, nextService: 'in 800 km', status: 'Active', pill: 'g', region: 'US South', carrier: 'In-house Fleet' },
    { id: 'TRK-US-5304', licensePlate: 'NY K53 8TR', class: '53ft Dry Van', driver: 'P. Smith', baseUtil: 84, nextService: 'overdue 400 km', status: 'Service Due', pill: 'r', region: 'US East', carrier: '3PL Partners' },
    { id: 'REEF-US-5305', licensePlate: 'AZ B7N 294', class: '53ft Reefer', driver: 'M. Wilson', baseUtil: 92, nextService: 'in 3,100 km', status: 'Active', pill: 'g', region: 'US West', carrier: 'In-house Fleet' },
    { id: 'TRK-US-5306', licensePlate: 'OH J4T 781', class: '53ft Dry Van', driver: 'D. Clark', baseUtil: 75, nextService: 'in 1,500 km', status: 'Available', pill: 'g', region: 'US Midwest', carrier: 'In-house Fleet' },
    { id: 'TRK-US-5307', licensePlate: 'WA 6C9 R21', class: '53ft Dry Van', driver: 'J. Taylor', baseUtil: 89, nextService: 'in 600 km', status: 'Active', pill: 'g', region: 'US West', carrier: '3PL Partners' },
    { id: 'REEF-US-4008', licensePlate: 'CO P82 4LM', class: '40ft Reefer', driver: 'H. White', baseUtil: 81, nextService: 'in 2,900 km', status: 'Active', pill: 'g', region: 'US West', carrier: 'In-house Fleet' },
    { id: 'TRK-US-5309', licensePlate: 'NV 3XK 672', class: '53ft Dry Van', driver: 'K. Harris', baseUtil: 72, nextService: 'in 4,200 km', status: 'Idle 2d', pill: 'a', region: 'US West', carrier: '3PL Partners' },
    { id: 'TRK-US-5310', licensePlate: 'GA R91 5QT', class: '53ft Dry Van', driver: 'E. Martin', baseUtil: 95, nextService: 'in 1,100 km', status: 'Active', pill: 'g', region: 'US South', carrier: 'In-house Fleet' },
    { id: 'REEF-US-5311', licensePlate: 'NC 8FD 321', class: '53ft Reefer', driver: 'L. Jackson', baseUtil: 33, nextService: 'in 100 km', status: 'Breakdown', pill: 'r', region: 'US East', carrier: 'In-house Fleet' },
    { id: 'TRK-US-5312', licensePlate: 'MI T72 9KP', class: '53ft Dry Van', driver: 'B. Lee', baseUtil: 86, nextService: 'in 2,000 km', status: 'Active', pill: 'g', region: 'US Midwest', carrier: '3PL Partners' },
    { id: 'TRK-US-5313', licensePlate: 'VA 5LM 847', class: '53ft Dry Van', driver: 'C. Allen', baseUtil: 90, nextService: 'in 1,800 km', status: 'Active', pill: 'g', region: 'US East', carrier: 'In-house Fleet' },
    { id: 'REEF-US-5314', licensePlate: 'IL Q63 2RX', class: '53ft Electric Reefer', driver: 'G. Young', baseUtil: 77, nextService: 'in 5,000 km', status: 'Charging', pill: 'a', region: 'US Midwest', carrier: 'In-house Fleet' }
  ];

  const filteredVehicles = MASTER_VEHICLES.filter(v => {
    if (regionFilter !== 'ALL REGIONS' && regionFilter !== 'All' && v.region !== regionFilter) return false;
    if (carrierFilter !== 'ALL' && carrierFilter !== 'All') {
      if (carrierFilter === 'In-house Fleet' && v.carrier !== 'In-house Fleet') return false;
      if (carrierFilter === '3PL Partners' && v.carrier === 'In-house Fleet') return false;
      if (carrierFilter !== 'In-house Fleet' && carrierFilter !== '3PL Partners' && v.carrier !== carrierFilter) return false;
    }
    return true;
  });

  const MASTER_SHIPMENTS = [
    { id: 'LQ-88214', lane: 'Chicago → Atlanta', mode: 'Road (FTL)', carrier: 'FedEx Freight', region: 'US Midwest', eta: 'Today 18:40', progress: 82, status: 'In Transit', pill: 'b' },
    { id: 'LQ-88109', lane: 'New York → Chicago', mode: 'Rail', carrier: 'JB Hunt Transport', region: 'US East', eta: 'Tomorrow 09:15', progress: 54, status: 'In Transit', pill: 'b' },
    { id: 'LQ-87772', lane: 'Los Angeles → Dallas', mode: 'Road (FTL)', carrier: 'XPO Logistics', region: 'US West', eta: 'Delayed +6h', progress: 61, status: 'At Risk', pill: 'r' },
    { id: 'LQ-88350', lane: 'Dallas → Houston', mode: 'Road (LTL)', carrier: 'In-house Fleet', region: 'US South', eta: 'Today 21:00', progress: 95, status: 'Out for Delivery', pill: 'a' },
    { id: 'LQ-88411', lane: 'Memphis → Nashville', mode: 'Reefer', carrier: 'In-house Fleet', region: 'US South', eta: 'Today 14:20', progress: 100, status: 'Delivered', pill: 'g' }
  ];

  const filteredShipments = MASTER_SHIPMENTS.filter(s => {
    if (regionFilter !== 'ALL REGIONS' && regionFilter !== 'All' && s.region !== regionFilter) return false;
    if (modeFilter !== 'ALL MODES' && modeFilter !== 'All') {
      const t = modeFilter.replace('Road (', '').replace(')', '');
      if (s.mode !== modeFilter && !s.mode.includes(t)) return false;
    }
    if (carrierFilter !== 'ALL' && carrierFilter !== 'All') {
      if (carrierFilter === 'In-house Fleet' && s.carrier !== 'In-house Fleet') return false;
      if (carrierFilter === '3PL Partners' && s.carrier === 'In-house Fleet') return false;
      if (carrierFilter !== 'In-house Fleet' && carrierFilter !== '3PL Partners' && s.carrier !== carrierFilter) return false;
    }
    return true;
  });

  const scaledShipmentCount = Math.round((apiStats.shipmentCount || 12480) * periodMult);
  const scaledFreightSpend = (8.41 * periodMult).toFixed(2);
  const scaledInTransitCount = Math.round(9140 * periodMult);

  // Filtered signals logic
  const filteredSignals = signals.filter(s => {
    if (regionFilter !== 'ALL REGIONS' && regionFilter !== 'All' && s.region !== regionFilter) return false;
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
    if (severityFilter !== 'All' && s.severity !== severityFilter) return false;
    if (typeFilter !== 'All' && s.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.title.toLowerCase().includes(q) && !s.detail.toLowerCase().includes(q) && !s.refCode.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const currentSignal = signals.find(x => x.id === selectedSignalId);
  const currentPrediction = PREDICTION_DETAILS[predictionKey] || PREDICTION_DETAILS.stockout;
  const currentSim = SIM_CONTENT[simTab];

  // Title getter for active page
  const pageTitles = {
    overview: 'Global Overview',
    fleet: 'Fleet Performance',
    tracking: 'Shipment Tracking',
    cost: 'Cost Intelligence',
    signals: 'Signals Board',
    control: 'Control Tower',
    warehouse: 'Warehouse & Yard',
    routes: 'Route Optimization',
    carriers: 'Carrier Scorecards',
    exceptions: 'Exception Manager',
    sustainability: 'Sustainability',
    forecast: 'Demand Forecast'
  };

  // Helper meter component
  const MeterRow = ({ label, pct, color = '#2563eb' }) => (
    <div className="meter-row">
      <span className="lbl">{label}</span>
      <div className="meter-track">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="pct">{pct}%</span>
    </div>
  );

  return (
    <div className="fi-container">
      {/* Topbar Header matching Screenshots */}
      <div className="topbar">
        <h2>{pageTitles[activeTab] || 'Global Overview'}</h2>
        <div className="search">
          🔍 <input
            placeholder="Search shipments, lanes, carriers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="t-btn" onClick={() => syncLiveData(false)} title="Sync Live Data from API">
          {loadingApi ? '⌛ Syncing...' : '↻ API Sync'}
        </button>
        <button className="t-btn" onClick={toggleDarkMode} title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          {isDarkMode ? '☀️' : '☾'}
        </button>
        <button className="t-btn tour">◎ Tour</button>
        <button className="t-btn">🔔</button>
        <div className="avatar">
          <div className="circ">KV</div>
          <div className="who">
            Ops Director<br />
            <small>VP · SUPPLY CHAIN</small>
          </div>
        </div>
      </div>

      {/* Filters Bar matching Screenshots */}
      <div className="filters">
        <div className="filter">
          <label>PERIOD</label>
          <select value={periodToggle} onChange={(e) => handlePeriodChange(e.target.value)}>
            <option value="1d">Last 24 Hours</option>
            <option value="3d">Last 3 Days</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last 1 Year</option>
          </select>
        </div>
        <div className="filter">
          <label>REGION</label>
          <select value={regionFilter} onChange={(e) => handleRegionChange(e.target.value)}>
            <option value="ALL REGIONS">ALL REGIONS</option>
            <option value="US East">US East</option>
            <option value="US Midwest">US Midwest</option>
            <option value="US West">US West</option>
            <option value="US South">US South</option>
            <option value="APAC">APAC</option>
            <option value="EMEA">EMEA</option>
            <option value="Americas">Americas</option>
          </select>
        </div>
        <div className="filter">
          <label>MODE</label>
          <select value={modeFilter} onChange={(e) => handleModeChange(e.target.value)}>
            <option value="ALL MODES">ALL MODES</option>
            <option value="Road (FTL)">Road (FTL)</option>
            <option value="Road (LTL)">Road (LTL)</option>
            <option value="Ocean">Ocean</option>
            <option value="Air">Air</option>
            <option value="Rail">Rail</option>
          </select>
        </div>
        <div className="filter">
          <label>CARRIER</label>
          <select value={carrierFilter} onChange={(e) => handleCarrierChange(e.target.value)}>
            <option value="ALL">ALL CARRIERS</option>
            <option value="In-house Fleet">In-house Fleet</option>
            <option value="3PL Partners">3PL Partners</option>
            <option value="FedEx Freight">FedEx Freight</option>
            <option value="JB Hunt Transport">JB Hunt Transport</option>
            <option value="XPO Logistics">XPO Logistics</option>
            <option value="Old Dominion Freight">Old Dominion Freight</option>
          </select>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="content">
        {/* VIEW: Global Overview */}
        {activeTab === 'overview' && (
          <div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · Last sync 22s ago · {scaledShipmentCount.toLocaleString()} active shipments · {apiStats.assetCount} vehicles tracked
            </div>

            {/* KPI grid matching Screenshot 1 */}
            <div className="kpi-grid">
              <div className="kpi" onClick={() => openKpiDrawer('ON-TIME DELIVERY (OTD)', '92.4%', 'Target 95%', 'NEAR TARGET', 'near')}>
                <div className="kpi-head">
                  <span className="kpi-title">ON-TIME DELIVERY (OTD)</span>
                  <span className="kpi-ico">⏱️</span>
                </div>
                <div className="kpi-val">92.4<span className="u">%</span></div>
                <div className="kpi-delta up">↗ +2.4%</div>
                <div className="kpi-target">Target 95%</div>
                <span className="badge near">NEAR TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('COST PER SHIPMENT', '$18.6', 'Target $17.5', 'NEAR TARGET', 'near')}>
                <div className="kpi-head">
                  <span className="kpi-title">COST PER SHIPMENT</span>
                  <span className="kpi-ico">💲</span>
                </div>
                <div className="kpi-val">$18.6</div>
                <div className="kpi-delta up">↗ -3.1%</div>
                <div className="kpi-target">Target $17.5</div>
                <span className="badge near">NEAR TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('FLEET UTILIZATION', '81%', 'Target 80%', 'ON TARGET', 'on')}>
                <div className="kpi-head">
                  <span className="kpi-title">FLEET UTILIZATION</span>
                  <span className="kpi-ico">🚚</span>
                </div>
                <div className="kpi-val">81<span className="u">%</span></div>
                <div className="kpi-delta up">↗ +4.6%</div>
                <div className="kpi-target">Target 80%</div>
                <span className="badge on">ON TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('PERFECT ORDER RATE', '96.2%', 'Target 97%', 'NEAR TARGET', 'near')}>
                <div className="kpi-head">
                  <span className="kpi-title">PERFECT ORDER RATE</span>
                  <span className="kpi-ico">✅</span>
                </div>
                <div className="kpi-val">96.2<span className="u">%</span></div>
                <div className="kpi-delta up">↗ +1.2%</div>
                <div className="kpi-target">Target 97%</div>
                <span className="badge near">NEAR TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('AVG DWELL TIME', '3.4 hrs', 'Target 2.5 hrs', 'BELOW TARGET', 'below')}>
                <div className="kpi-head">
                  <span className="kpi-title">AVG DWELL TIME</span>
                  <span className="kpi-ico">🕒</span>
                </div>
                <div className="kpi-val">3.4<span className="u">hrs</span></div>
                <div className="kpi-delta down">↘ +0.6h</div>
                <div className="kpi-target">Target 2.5 hrs</div>
                <span className="badge below">BELOW TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('DAMAGE / LOSS RATE', '0.42%', 'Target 0.30%', 'BELOW TARGET', 'below')}>
                <div className="kpi-head">
                  <span className="kpi-title">DAMAGE / LOSS RATE</span>
                  <span className="kpi-ico">⚠️</span>
                </div>
                <div className="kpi-val">0.42<span className="u">%</span></div>
                <div className="kpi-delta up">↗ -0.08%</div>
                <div className="kpi-target">Target 0.30%</div>
                <span className="badge below">BELOW TARGET</span>
              </div>
            </div>

            {/* Order-to-Delivery Flow Panel matching Screenshot 2 */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h3>Order-to-Delivery Flow</h3>
                  <p>How shipments move from booking to confirmed delivery across the network.</p>
                </div>
                <div className="seg">
                  <button
                    className={funnelMode === 'shipments' ? 'on' : ''}
                    onClick={() => setFunnelMode('shipments')}
                  >
                    Shipments
                  </button>
                  <button
                    className={funnelMode === 'cost' ? 'on' : ''}
                    onClick={() => setFunnelMode('cost')}
                  >
                    Cost
                  </button>
                </div>
              </div>

              {funnelMode === 'shipments' ? (
                <div>
                  <div className="funnel-row">
                    <div className="funnel-label"><div className="t">Orders Booked</div><div className="s">184,500 units</div></div>
                    <div className="funnel-track"><div className="bar deep" style={{ flex: 1 }}>184,500<span className="sub">100%</span></div></div>
                  </div>
                  <div className="funnel-row">
                    <div className="funnel-label"><div className="t">Dispatched</div><div className="s">planned &amp; loaded</div></div>
                    <div className="funnel-track"><div className="bar mid" style={{ flex: 0.94 }}>173,430<span className="sub">94.0%</span></div><div className="bar ghost" style={{ flex: 0.06 }}>11,070</div></div>
                  </div>
                  <div className="funnel-row">
                    <div className="funnel-label"><div className="t">In Transit</div><div className="s">on-route</div></div>
                    <div className="funnel-track"><div className="bar mid" style={{ flex: 0.879 }}>162,120<span className="sub">87.9%</span></div><div className="bar ghost" style={{ flex: 0.121 }}>held / delayed</div></div>
                  </div>
                  <div className="funnel-row">
                    <div className="funnel-label"><div className="t">Delivered On-Time</div><div className="s">confirmed POD</div></div>
                    <div className="funnel-track"><div className="bar mid" style={{ flex: 0.821 }}>151,500<span className="sub">82.1%</span></div><div className="bar light" style={{ flex: 0.106 }}>19,600<span className="sub">late</span></div><div className="bar ghost" style={{ flex: 0.073 }}>exceptions</div></div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="funnel-row">
                    <div className="funnel-label"><div className="t">Orders Booked</div><div className="s">budgeted spend</div></div>
                    <div className="funnel-track"><div className="bar deep" style={{ flex: 1 }}>$8.42M<span className="sub">100%</span></div></div>
                  </div>
                  <div className="funnel-row">
                    <div className="funnel-label"><div className="t">Dispatched</div><div className="s">freight committed</div></div>
                    <div className="funnel-track"><div className="bar mid" style={{ flex: 0.942 }}>$7.93M<span className="sub">94.2%</span></div><div className="bar ghost" style={{ flex: 0.058 }}>$490K</div></div>
                  </div>
                  <div className="funnel-row">
                    <div className="funnel-label"><div className="t">In Transit</div><div className="s">in-flight spend</div></div>
                    <div className="funnel-track"><div className="bar mid" style={{ flex: 0.909 }}>$7.65M<span className="sub">90.9%</span></div><div className="bar ghost" style={{ flex: 0.091 }}>held</div></div>
                  </div>
                  <div className="funnel-row">
                    <div className="funnel-label"><div className="t">Delivered On-Time</div><div className="s">settled invoicing</div></div>
                    <div className="funnel-track"><div className="bar mid" style={{ flex: 0.839 }}>$7.06M<span className="sub">83.9%</span></div><div className="bar light" style={{ flex: 0.101 }}>$850K<span className="sub">variance</span></div><div className="bar ghost" style={{ flex: 0.06 }}>disputed</div></div>
                  </div>
                </div>
              )}
            </div>

            {/* Two Column Layout matching Screenshot 2 */}
            <div className="two-col">
              <div className="panel">
                <div className="mini-title">Lane Performance ({filteredLanes.length})</div>
                <table>
                  <thead>
                    <tr>
                      <th>Lane</th>
                      <th style={{ textAlign: 'right' }}>Loads</th>
                      <th style={{ textAlign: 'right' }}>On-Time</th>
                      <th style={{ textAlign: 'right' }}>Cost / km</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLanes.map(l => (
                      <tr key={l.id}>
                        <td><b>{l.name}</b></td>
                        <td className="num">{Math.round(l.baseLoads * periodMult).toLocaleString()}</td>
                        <td className="num">{l.baseOtd}%</td>
                        <td className="num">${l.baseCostKm}</td>
                        <td><span className={`pill ${l.statusPill}`}>{l.status}</span></td>
                      </tr>
                    ))}
                    {filteredLanes.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-mute)', padding: '16px' }}>No active lanes match current filter criteria</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <div className="mini-title">Top Carriers by Volume</div>
                {filteredCarriers.map((c, i) => (
                  <div key={c.name} className="rank-item">
                    <div className="rank-num">{i + 1}</div>
                    <div className="rank-body">
                      <div className="n">{c.name}</div>
                      <div className="rank-bar"><span style={{ width: c.pct }} /></div>
                    </div>
                    <div className="rank-val">{Math.round(c.baseVol * periodMult).toLocaleString()}</div>
                  </div>
                ))}
                {filteredCarriers.length === 0 && (
                  <div style={{ color: 'var(--ink-mute)', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>No carriers match current filter criteria</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: Fleet Performance matching Screenshots */}
        {activeTab === 'fleet' && (
          <div>
            <div className="section-lead">
              <h3>Fleet Performance</h3>
              <p>Utilization, uptime, and productivity across {apiStats.assetCount} owned and contracted vehicles.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · {apiStats.assetCount} vehicles · 588 active · 34 in maintenance · 18 idle
            </div>

            {/* KPI grid matching Screenshot 2 */}
            <div className="kpi-grid">
              <div className="kpi" onClick={() => openKpiDrawer('FLEET UTILIZATION', '81%', 'Target 80%', 'ON TARGET', 'on')}>
                <div className="kpi-head">
                  <span className="kpi-title">FLEET UTILIZATION</span>
                  <span className="kpi-ico">🚚</span>
                </div>
                <div className="kpi-val">81<span className="u">%</span></div>
                <div className="kpi-delta up">↗ +4.6%</div>
                <div className="kpi-target">Target 80%</div>
                <span className="badge on">ON TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('VEHICLE UPTIME', '94.7%', 'Target 95%', 'NEAR TARGET', 'near')}>
                <div className="kpi-head">
                  <span className="kpi-title">VEHICLE UPTIME</span>
                  <span className="kpi-ico">🔧</span>
                </div>
                <div className="kpi-val">94.7<span className="u">%</span></div>
                <div className="kpi-delta up">↗ +1.1%</div>
                <div className="kpi-target">Target 95%</div>
                <span className="badge near">NEAR TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('AVG KM PER VEHICLE / DAY', '312 km', 'Target 300 km', 'ON TARGET', 'on')}>
                <div className="kpi-head">
                  <span className="kpi-title">AVG KM PER VEHICLE / DAY</span>
                  <span className="kpi-ico">🛣️</span>
                </div>
                <div className="kpi-val">312<span className="u">km</span></div>
                <div className="kpi-delta up">↗ +3.2%</div>
                <div className="kpi-target">Target 300 km</div>
                <span className="badge on">ON TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('EMPTY MILES (DEADHEAD)', '14.8%', 'Target 12%', 'NEAR TARGET', 'near')}>
                <div className="kpi-head">
                  <span className="kpi-title">EMPTY MILES (DEADHEAD)</span>
                  <span className="kpi-ico">↩️</span>
                </div>
                <div className="kpi-val">14.8<span className="u">%</span></div>
                <div className="kpi-delta up">↗ -1.9%</div>
                <div className="kpi-target">Target 12%</div>
                <span className="badge near">NEAR TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('FUEL EFFICIENCY', '4.1 km/L', 'Target 4.5 km/L', 'BELOW TARGET', 'below')}>
                <div className="kpi-head">
                  <span className="kpi-title">FUEL EFFICIENCY</span>
                  <span className="kpi-ico">⛽</span>
                </div>
                <div className="kpi-val">4.1<span className="u">km/L</span></div>
                <div className="kpi-delta down">↘ -0.2</div>
                <div className="kpi-target">Target 4.5 km/L</div>
                <span className="badge below">BELOW TARGET</span>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('MAINTENANCE COST / KM', '$0.11', 'Target $0.09', 'BELOW TARGET', 'below')}>
                <div className="kpi-head">
                  <span className="kpi-title">MAINTENANCE COST / KM</span>
                  <span className="kpi-ico">🛠️</span>
                </div>
                <div className="kpi-val">$0.11</div>
                <div className="kpi-delta down">↘ +$0.01</div>
                <div className="kpi-target">Target $0.09</div>
                <span className="badge below">BELOW TARGET</span>
              </div>
            </div>

            {/* Fleet Status & Utilization Panels matching Screenshot 2 */}
            <div className="two-col even">
              <div className="panel">
                <div className="mini-title">Fleet Status Breakdown</div>
                <MeterRow label="Active / on-route" pct={62} color="#16a34a" />
                <MeterRow label="Loading / unloading" pct={18} color="#2563eb" />
                <MeterRow label="Scheduled maintenance" pct={10} color="#d97706" />
                <MeterRow label="Idle / unassigned" pct={7} color="#9aa8bd" />
                <MeterRow label="Breakdown / repair" pct={3} color="#dc2626" />
              </div>

              <div className="panel">
                <div className="mini-title">Utilization by Vehicle Class</div>
                <MeterRow label="40ft Container Trucks" pct={88} color="#2563eb" />
                <MeterRow label="32ft Multi-Axle" pct={84} color="#2563eb" />
                <MeterRow label="20ft Box Trucks" pct={79} color="#2563eb" />
                <MeterRow label="Reefer (Cold Chain)" pct={73} color="#2563eb" />
                <MeterRow label="LCV / Last-Mile Vans" pct={66} color="#2563eb" />
              </div>
            </div>

            {/* Vehicle Watchlist Panel matching Screenshot 1 */}
            <div className="panel">
              <div className="mini-title">Vehicle Watchlist</div>
              <table>
                <thead>
                  <tr>
                    <th>VEHICLE ID</th>
                    <th>CLASS</th>
                    <th>DRIVER</th>
                    <th style={{ textAlign: 'right' }}>UTIL. (30D)</th>
                    <th style={{ textAlign: 'right' }}>NEXT SERVICE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => (
                    <tr key={v.id}>
                      <td>
                        <b>{v.id}</b>
                        {v.licensePlate && (
                          <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #cddafc', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', marginLeft: '8px' }}>
                            🚘 {v.licensePlate}
                          </span>
                        )}
                      </td>
                      <td>{v.class}</td>
                      <td>{v.driver}</td>
                      <td className="num">{v.baseUtil}%</td>
                      <td className="num">{v.nextService}</td>
                      <td><span className={`pill ${v.pill}`}>{v.status}</span></td>
                    </tr>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--ink-mute)', padding: '16px' }}>No vehicles match current filter criteria</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: Shipment Tracking */}
        {activeTab === 'tracking' && (
          <div>
            <div className="section-lead">
              <h3>Shipment Tracking</h3>
              <p>Real-time visibility into every active load, its ETA, and milestone status.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · {apiStats.shipmentCount.toLocaleString()} active shipments · 9,140 in transit · 1,020 at risk of SLA breach
            </div>
            <div className="kpi-grid four">
              <div className="kpi" onClick={() => openKpiDrawer('IN TRANSIT', '9,140', 'of active', 'ACTIVE', 'on')}><div className="kpi-head"><span className="kpi-title">In Transit</span><span className="kpi-ico">🚛</span></div><div className="kpi-val">9,140</div><div className="kpi-delta up">↗ +220</div><div className="kpi-target">of {apiStats.shipmentCount.toLocaleString()} active</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('DELIVERED TODAY', '3,320', 'vs 3,060 yesterday', 'OPTIMAL', 'on')}><div className="kpi-head"><span className="kpi-title">Delivered Today</span><span className="kpi-ico">📬</span></div><div className="kpi-val">3,320</div><div className="kpi-delta up">↗ +8.4%</div><div className="kpi-target">vs 3,060 yesterday</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('AT-RISK / DELAYED', '1,020', 'SLA breach risk', 'AT RISK', 'below')}><div className="kpi-head"><span className="kpi-title">At-Risk / Delayed</span><span className="kpi-ico">⏳</span></div><div className="kpi-val">1,020</div><div className="kpi-delta down">↘ +140</div><div className="kpi-target">SLA breach risk</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('AVG ETA ACCURACY', '91.3%', 'Target 92%', 'NEAR TARGET', 'near')}><div className="kpi-head"><span className="kpi-title">Avg ETA Accuracy</span><span className="kpi-ico">🎯</span></div><div className="kpi-val">91.3<span className="u">%</span></div><div className="kpi-delta up">↗ +2.0%</div><div className="kpi-target">Target 92%</div></div>
            </div>
            <div className="panel">
              <div className="panel-head"><div><h3>Shipment Status Distribution</h3><p>Where every active load sits in its journey right now.</p></div></div>
              <div className="funnel-row"><div className="funnel-label"><div className="t">Booked</div><div className="s">awaiting pickup</div></div><div className="funnel-track"><div className="bar deep" style={{ flex: 0.14 }}>1,740</div><div className="bar ghost" style={{ flex: 0.86 }} /></div></div>
              <div className="funnel-row"><div className="funnel-label"><div className="t">Picked Up</div><div className="s">at origin</div></div><div className="funnel-track"><div className="bar mid" style={{ flex: 0.28 }}>3,540</div><div className="bar ghost" style={{ flex: 0.72 }} /></div></div>
              <div className="funnel-row"><div className="funnel-label"><div className="t">In Transit</div><div className="s">on-route</div></div><div className="funnel-track"><div className="bar mid" style={{ flex: 0.73 }}>9,140</div><div className="bar ghost" style={{ flex: 0.27 }} /></div></div>
              <div className="funnel-row"><div className="funnel-label"><div className="t">Out for Delivery</div><div className="s">last leg</div></div><div className="funnel-track"><div className="bar light" style={{ flex: 0.36 }}>4,510</div><div className="bar ghost" style={{ flex: 0.64 }} /></div></div>
            </div>
            <div className="panel">
              <div className="mini-title">Live Shipment Feed</div>
              <table>
                <thead><tr><th>Tracking ID</th><th>Lane</th><th>Mode</th><th style={{ textAlign: 'right' }}>ETA</th><th style={{ textAlign: 'right' }}>Progress</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredShipments.map(s => (
                    <tr key={s.id}>
                      <td><b>{s.id}</b></td>
                      <td>{s.lane}</td>
                      <td>{s.mode}</td>
                      <td className="num">{s.eta}</td>
                      <td className="num">{s.progress}%</td>
                      <td><span className={`pill ${s.pill}`}>{s.status}</span></td>
                    </tr>
                  ))}
                  {filteredShipments.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--ink-mute)', padding: '16px' }}>No live shipments match current filter criteria</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: Cost Intelligence */}
        {activeTab === 'cost' && (
          <div>
            <div className="section-lead">
              <h3>Cost Intelligence</h3>
              <p>Freight spend, unit economics, and where margin is leaking.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · Monthly freight spend $8.42M · 6.1% of revenue
            </div>
            <div className="kpi-grid">
              <div className="kpi" onClick={() => openKpiDrawer('TOTAL FREIGHT SPEND', '$8.42M', 'Budget $8.6M', 'ON TARGET', 'on')}><span className="badge on">ON TARGET</span><div className="kpi-head"><span className="kpi-title">Total Freight Spend</span><span className="kpi-ico">💰</span></div><div className="kpi-val">$8.42<span className="u">M</span></div><div className="kpi-delta up">↗ -2.3%</div><div className="kpi-target">Budget $8.6M</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('FREIGHT % OF REVENUE', '6.1%', 'Target 6.0%', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Freight % of Revenue</span><span className="kpi-ico">📊</span></div><div className="kpi-val">6.1<span className="u">%</span></div><div className="kpi-delta up">↗ -0.3%</div><div className="kpi-target">Target 6.0%</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('COST PER SHIPMENT', '$18.6', 'Target $17.5', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Cost per Shipment</span><span className="kpi-ico">💲</span></div><div className="kpi-val">$18.6</div><div className="kpi-delta up">↗ -3.1%</div><div className="kpi-target">Target $17.5</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('COST PER TONNE-KM', '$0.061', 'Target $0.058', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Cost per Tonne-Km</span><span className="kpi-ico">⚖️</span></div><div className="kpi-val">$0.061</div><div className="kpi-delta up">↗ -1.4%</div><div className="kpi-target">Target $0.058</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('ACCESSORIAL CHARGES', '$412K', 'Target $360K', 'BELOW TARGET', 'below')}><span className="badge below">BELOW TARGET</span><div className="kpi-head"><span className="kpi-title">Accessorial Charges</span><span className="kpi-ico">➕</span></div><div className="kpi-val">$412<span className="u">K</span></div><div className="kpi-delta down">↘ +6.2%</div><div className="kpi-target">Target $360K</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('DETENTION COST', '$188K', 'Target $140K', 'BELOW TARGET', 'below')}><span className="badge below">BELOW TARGET</span><div className="kpi-head"><span className="kpi-title">Detention Cost</span><span className="kpi-ico">⏱️</span></div><div className="kpi-val">$188<span className="u">K</span></div><div className="kpi-delta down">↘ +11%</div><div className="kpi-target">Target $140K</div></div>
            </div>
            <div className="two-col even">
              <div className="panel">
                <div className="mini-title">Spend by Mode</div>
                <MeterRow label="Road (FTL)" pct={100} color="var(--blue-deep)" />
                <MeterRow label="Road (LTL)" pct={58} color="var(--blue)" />
                <MeterRow label="Ocean" pct={41} color="var(--blue)" />
                <MeterRow label="Rail" pct={27} color="var(--blue)" />
                <MeterRow label="Air" pct={16} color="var(--blue)" />
              </div>
              <div className="panel">
                <div className="mini-title">Cost Leakage Drivers</div>
                <MeterRow label="Empty miles / deadhead" pct={72} color="var(--red)" />
                <MeterRow label="Detention &amp; demurrage" pct={55} color="var(--red)" />
                <MeterRow label="Expedited / premium freight" pct={48} color="var(--amber)" />
                <MeterRow label="Re-deliveries" pct={31} color="var(--amber)" />
                <MeterRow label="Manual invoicing errors" pct={19} color="var(--amber)" />
              </div>
            </div>
          </div>
        )}

        {/* VIEW: Signals Board */}
        {activeTab === 'signals' && (
          <div>
            <div className="section-lead">
              <h3>Signals Board</h3>
              <p>Executive feed of critical alerts, competitor moves, and AI-flagged opportunities across the network.</p>
            </div>

            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · {signals.length} active signals · {signals.filter(s => s.severity === 'critical').length} critical · {signals.filter(s => s.type === 'Competitor').length} competitor movements
            </div>

            {/* 4 KPI Top Cards matching Screenshot 1 */}
            <div className="kpi-grid four">
              <div className="kpi" onClick={() => openKpiDrawer('ACTIVE CRITICAL ALERTS', `${signals.filter(s => s.severity === 'critical' && !s.ack).length}`, 'Requires VP triage', 'CRITICAL', 'below')}>
                <div className="kpi-head">
                  <span className="kpi-title">ACTIVE CRITICAL ALERTS</span>
                  <span className="kpi-ico">🚨</span>
                </div>
                <div className="kpi-val">{signals.filter(s => s.severity === 'critical' && !s.ack).length}</div>
                <div className="kpi-delta down">↘ Requires VP triage</div>
                <div className="kpi-target">Port &amp; Container Buffer Risks</div>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('COMPETITOR MOVEMENTS', `${signals.filter(s => s.type === 'Competitor' && !s.ack).length}`, 'Market capacity pressure', 'WATCH', 'near')}>
                <div className="kpi-head">
                  <span className="kpi-title">COMPETITOR MOVEMENTS</span>
                  <span className="kpi-ico">🛡️</span>
                </div>
                <div className="kpi-val">{signals.filter(s => s.type === 'Competitor' && !s.ack).length}</div>
                <div className="kpi-delta up">↗ Spot rate pressure</div>
                <div className="kpi-target">Carrier Spot Rate Spikes</div>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('REVENUE EXPOSURE', '$2.0M', 'SLA & penalty risk', 'EXPOSURE', 'below')}>
                <div className="kpi-head">
                  <span className="kpi-title">REVENUE EXPOSURE</span>
                  <span className="kpi-ico">📉</span>
                </div>
                <div className="kpi-val">$2.0<span className="u">M</span></div>
                <div className="kpi-delta down">↘ Demurrage exposure</div>
                <div className="kpi-target">Demurrage + SLA Breaches</div>
              </div>

              <div className="kpi" onClick={() => openKpiDrawer('IDENTIFIED OPPORTUNITIES', '$1.2M', 'Capacity optimization', 'OPPORTUNITY', 'on')}>
                <div className="kpi-head">
                  <span className="kpi-title">IDENTIFIED OPPORTUNITIES</span>
                  <span className="kpi-ico">✨</span>
                </div>
                <div className="kpi-val">$1.2<span className="u">M</span></div>
                <div className="kpi-delta up">↗ +12% Utilization</div>
                <div className="kpi-target">3D Container Bin-Packing</div>
              </div>
            </div>

            {/* AI Risk Predictions Block */}
            <div className="panel">
              <div className="panel-head" style={{ alignItems: 'center' }}>
                <div>
                  <h3>AI Risk Predictions</h3>
                  <p>Predictive risk scoring across logistics lanes, container load plans, port bottlenecks, and temperature excursions.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="seg">
                    {['30d', '60d', '90d'].map(h => (
                      <button key={h} className={timeHorizon === h ? 'on' : ''} onClick={() => setTimeHorizon(h)}>
                        {h}
                      </button>
                    ))}
                  </div>
                  <button className="t-btn" onClick={() => showToast('Re-Scanning Network', 'Re-evaluating ML risk models across all active lanes...', 'blue')}>
                    🔄 Re-Scan
                  </button>
                </div>
              </div>

              <div className="fi-risk-grid">
                {/* Card 1 */}
                <div className="fi-risk-card">
                  <div className="tag">
                    <span className="badge-blue">CONTAINER BUFFER RISK</span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>88% Prob</span>
                  </div>
                  <h5 style={{ fontWeight: 700, fontSize: '15px', marginTop: '10px' }}>Container Deficit at APAC Hub</h5>
                  <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px', marginBottom: '14px' }}>
                    40ft High-Cube container buffer depleted. Predicted equipment deficit in 4 days.
                  </p>
                  <div className="fi-risk-track"><span style={{ width: '88%', background: '#ef4444' }} /></div>
                  <div className="fi-risk-stat">
                    <span>Projected Loss</span>
                    <b style={{ color: '#ef4444' }}>$850K</b>
                  </div>
                  <button className="fi-btn primary" onClick={() => openPredictionDetail('stockout')}>🔎 View Prediction Detail</button>
                </div>

                {/* Card 2 */}
                <div className="fi-risk-card">
                  <div className="tag">
                    <span className="badge-blue">PORT &amp; RAIL</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>76% Prob</span>
                  </div>
                  <h5 style={{ fontWeight: 700, fontSize: '15px', marginTop: '10px' }}>Rotterdam Terminal Demurrage</h5>
                  <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px', marginBottom: '14px' }}>
                    Port crane lockout extending intermodal transit lag by 15 days.
                  </p>
                  <div className="fi-risk-track"><span style={{ width: '76%', background: '#f59e0b' }} /></div>
                  <div className="fi-risk-stat">
                    <span>Transit Lag</span>
                    <b style={{ color: '#f59e0b' }}>+15 Days</b>
                  </div>
                  <button className="fi-btn primary" onClick={() => openPredictionDetail('packaging')}>🔎 View Prediction Detail</button>
                </div>

                {/* Card 3 */}
                <div className="fi-risk-card">
                  <div className="tag">
                    <span className="badge-blue">CARRIER CAPACITY</span>
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>92% Prob</span>
                  </div>
                  <h5 style={{ fontWeight: 700, fontSize: '15px', marginTop: '10px' }}>EU Freight Corridor Spot Spike</h5>
                  <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px', marginBottom: '14px' }}>
                    Carrier capacity contraction driving 12% spot rate surge across EU lanes.
                  </p>
                  <div className="fi-risk-track"><span style={{ width: '92%', background: '#2563eb' }} /></div>
                  <div className="fi-risk-stat">
                    <span>Freight Cost Surge</span>
                    <b style={{ color: '#2563eb' }}>+12%</b>
                  </div>
                  <button className="fi-btn primary" onClick={() => openPredictionDetail('priceWar')}>🔎 View Prediction Detail</button>
                </div>

                {/* Card 4 */}
                <div className="fi-risk-card">
                  <div className="tag">
                    <span className="badge-blue">CONTAINER LOAD PLANNING</span>
                    <span style={{ color: '#7c3aed', fontWeight: 700 }}>64% Prob</span>
                  </div>
                  <h5 style={{ fontWeight: 700, fontSize: '15px', marginTop: '10px' }}>LIFO &amp; Axle Weight Violation</h5>
                  <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px', marginBottom: '14px' }}>
                    Non-LIFO load sequence causing multi-drop unloading delay &amp; tandem axle overload.
                  </p>
                  <div className="fi-risk-track"><span style={{ width: '64%', background: '#7c3aed' }} /></div>
                  <div className="fi-risk-stat">
                    <span>Handling Delay</span>
                    <b style={{ color: '#7c3aed' }}>+3.5 Hours</b>
                  </div>
                  <button className="fi-btn primary" onClick={() => openPredictionDetail('cannibalization')}>🔎 View Prediction Detail</button>
                </div>

                {/* Card 5 - Red Outline */}
                <div className="fi-risk-card red-outline">
                  <div className="tag">
                    <span className="badge-blue">COLD-CHAIN RISK</span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>92% Prob</span>
                  </div>
                  <h5 style={{ fontWeight: 700, fontSize: '15px', marginTop: '10px' }}>Reefer Temperature Excursion</h5>
                  <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px', marginBottom: '14px' }}>
                    Reefer compressor telemetry breach puts temperature-sensitive cargo at risk.
                  </p>
                  <div className="fi-risk-track"><span style={{ width: '92%', background: '#ef4444' }} /></div>
                  <div className="fi-risk-stat">
                    <span>Model</span>
                    <b style={{ color: '#ef4444' }}>REEFER-IOT-V3.4</b>
                  </div>
                  <button className="fi-btn primary" onClick={() => openPredictionDetail('brandA')}>🔎 View Prediction Detail</button>
                </div>
              </div>
            </div>

            {/* Signal List & Filters — Risk Signals Drill Down */}
            <div className="panel">
              <div className="panel-head" style={{ marginBottom: '16px' }}>
                <div>
                  <h3>Risk Signals</h3>
                  <p>Drill down into critical alerts, carrier movements, and network operational risks.</p>
                </div>
              </div>
              {/* Filters Bar */}
              <div className="fi-signals-filter-bar">
                <div className="fi-filter-group">
                  <label>REGION</label>
                  <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                    <option value="All">All Regions</option>
                    <option value="US East">US East</option>
                    <option value="US Midwest">US Midwest</option>
                    <option value="US West">US West</option>
                    <option value="US South">US South</option>
                    <option value="APAC">APAC</option>
                    <option value="EMEA">EMEA</option>
                    <option value="Americas">Americas</option>
                  </select>
                </div>

                <div className="fi-filter-group">
                  <label>CATEGORY</label>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                    <option value="All">All Categories</option>
                    <option value="Container Load Planning">Container Load Planning</option>
                    <option value="Port &amp; Rail">Port &amp; Rail</option>
                    <option value="Fleet &amp; Carriers">Fleet &amp; Carriers</option>
                    <option value="Transportation">Transportation</option>
                  </select>
                </div>

                <div className="fi-filter-group">
                  <label>SEVERITY</label>
                  <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                    <option value="All">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Informational</option>
                  </select>
                </div>

                <div className="fi-filter-group">
                  <label>TYPE</label>
                  <div className="fi-type-pills">
                    {['All', 'Opportunity', 'Risk', 'Competitor'].map(t => (
                      <button key={t} className={`fi-type-btn ${typeFilter === t ? 'on' : ''}`} onClick={() => setTypeFilter(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fi-filter-group search-group">
                  <label>SEARCH</label>
                  <div className="fi-search-input">
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Search signals, ref codes..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-bar: Counter & View Toggle */}
              <div className="fi-signals-subbar">
                <div className="fi-signals-counter">
                  Showing <b>{filteredSignals.length}</b> signals
                  {(regionFilter !== 'All' || categoryFilter !== 'All' || severityFilter !== 'All' || typeFilter !== 'All' || searchQuery) && (
                    <button className="fi-reset-link" onClick={() => {
                      setRegionFilter('All');
                      setCategoryFilter('All');
                      setSeverityFilter('All');
                      setTypeFilter('All');
                      setSearchQuery('');
                    }}>
                      Reset Filters
                    </button>
                  )}
                </div>

                <div className="seg">
                  <button className={signalView === 'grid' ? 'on' : ''} onClick={() => setSignalView('grid')}>
                    ▦ Grid
                  </button>
                  <button className={signalView === 'table' ? 'on' : ''} onClick={() => setSignalView('table')}>
                    ☰ Table
                  </button>
                </div>
              </div>

              {/* Grid or Table View */}
              {signalView === 'grid' ? (
                <div className="fi-sig-grid">
                  {filteredSignals.map(s => (
                    <div key={s.id} className="fi-sig-card">
                      <div className="fi-sig-top">
                        <span className={`fi-sev ${s.severity}`}>
                          ● {s.severity.toUpperCase()}
                        </span>
                        <span className="fi-sig-ref">{s.refCode}</span>
                      </div>

                      <div>
                        <h4 onClick={() => openSignalDetail(s.id)}>{s.title}</h4>
                        <p className="fi-sig-desc">{s.detail}</p>
                      </div>

                      <div className="fi-sig-meta">
                        <span>{s.category} · {s.region}</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.type}</span>
                      </div>

                      <div className="fi-sig-impact">
                        <span>Impact</span>
                        <b>{s.impact}</b>
                      </div>

                      <div className="fi-sig-actions">
                        <button className={`fi-btn ack ${s.ack ? 'on' : ''}`} onClick={() => toggleAck(s.id)}>
                          {s.ack ? '✓ Acknowledged' : 'Acknowledge'}
                        </button>
                        <button className="fi-btn primary" onClick={() => openSignalDetail(s.id)}>
                          Investigate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Ref Code</th>
                      <th>Signal Title</th>
                      <th>Category</th>
                      <th>Region</th>
                      <th>Severity</th>
                      <th style={{ textAlign: 'right' }}>Impact</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSignals.map(s => (
                      <tr key={s.id}>
                        <td><b>{s.refCode}</b></td>
                        <td>{s.title}</td>
                        <td>{s.category}</td>
                        <td>{s.region}</td>
                        <td><span className={`fi-sev ${s.severity}`}>● {s.severity.toUpperCase()}</span></td>
                        <td className="num">{s.impact}</td>
                        <td className="num">
                          <button className="fi-btn primary" onClick={() => openSignalDetail(s.id)}>Investigate →</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* VIEW: Control Tower */}
        {activeTab === 'control' && (
          <div>
            <div className="section-lead">
              <h3>Control Tower</h3>
              <p>Single pane for live exceptions, escalations, and network health.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · 7 open escalations · 3 critical · avg resolution 42 min
            </div>
            <div className="kpi-grid four">
              <div className="kpi" onClick={() => openKpiDrawer('OPEN EXCEPTIONS', '148', 'vs 160 yesterday', 'ACTIVE', 'near')}><div className="kpi-head"><span className="kpi-title">OPEN EXCEPTIONS</span><span className="kpi-ico">🚨</span></div><div className="kpi-val">148</div><div className="kpi-delta up">↗ -12</div><div className="kpi-target">vs 160 yesterday</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('CRITICAL ESCALATIONS', '3', 'needs action now', 'HIGH RISK', 'below')}><div className="kpi-head"><span className="kpi-title">CRITICAL ESCALATIONS</span><span className="kpi-ico">🔴</span></div><div className="kpi-val" style={{ color: 'var(--red)' }}>3</div><div className="kpi-delta down">↘ +1</div><div className="kpi-target">needs action now</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('AVG RESOLUTION TIME', '42 min', 'Target 45 min', 'ON TARGET', 'on')}><div className="kpi-head"><span className="kpi-title">AVG RESOLUTION TIME</span><span className="kpi-ico">⏲️</span></div><div className="kpi-val">42<span className="u">min</span></div><div className="kpi-delta up">↗ -8min</div><div className="kpi-target">Target 45 min</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('NETWORK HEALTH SCORE', '88/100', 'Target 90', 'HEALTHY', 'on')}><div className="kpi-head"><span className="kpi-title">NETWORK HEALTH SCORE</span><span className="kpi-ico">💚</span></div><div className="kpi-val">88<span className="u">/100</span></div><div className="kpi-delta up">↗ +3</div><div className="kpi-target">Target 90</div></div>
            </div>
            <div className="panel">
              <div className="mini-title">Live Escalation Queue</div>
              <table>
                <thead><tr><th>Priority</th><th>Issue</th><th>Shipment</th><th>Owner</th><th style={{ textAlign: 'right' }}>Open For</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td><span className="pill r">CRITICAL</span></td><td>Reefer temp breach</td><td><b>LQ-88109</b></td><td>S. Davis</td><td className="num">18 min</td><td>Investigating</td></tr>
                  <tr><td><span className="pill r">CRITICAL</span></td><td>Vehicle breakdown</td><td><b>LQ-87990</b></td><td>P. Smith</td><td className="num">34 min</td><td>Reroute</td></tr>
                  <tr><td><span className="pill a">HIGH</span></td><td>SLA at risk (weather)</td><td><b>LQ-87772</b></td><td>Control</td><td className="num">1h 12m</td><td>Monitoring</td></tr>
                  <tr><td><span className="pill a">HIGH</span></td><td>Customs hold</td><td><b>LQ-88044</b></td><td>M. Wilson</td><td className="num">3h 40m</td><td>Escalated</td></tr>
                  <tr><td><span className="pill b">MEDIUM</span></td><td>POD not received</td><td><b>LQ-87610</b></td><td>A. Johnson</td><td className="num">5h 05m</td><td>Chasing</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: Warehouse & Yard */}
        {activeTab === 'warehouse' && (
          <div>
            <div className="section-lead">
              <h3>Warehouse &amp; Yard</h3>
              <p>Throughput, dock efficiency, and inventory posture across hubs.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · 6 hubs · 1,240 dock appointments today · 82% on-schedule
            </div>
            <div className="kpi-grid">
              <div className="kpi" onClick={() => openKpiDrawer('DOCK UTILIZATION', '84%', 'Target 85%', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Dock Utilization</span><span className="kpi-ico">🏭</span></div><div className="kpi-val">84<span className="u">%</span></div><div className="kpi-delta up">↗ +2.1%</div><div className="kpi-target">Target 85%</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('AVG DWELL TIME', '3.4 hrs', 'Target 2.5 hrs', 'BELOW TARGET', 'below')}><span className="badge below">BELOW TARGET</span><div className="kpi-head"><span className="kpi-title">Avg Dwell Time</span><span className="kpi-ico">🕒</span></div><div className="kpi-val">3.4<span className="u">hrs</span></div><div className="kpi-delta down">↘ +0.6h</div><div className="kpi-target">Target 2.5 hrs</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('ORDER PICKING ACCURACY', '99.1%', 'Target 99.5%', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Order Picking Accuracy</span><span className="kpi-ico">🎯</span></div><div className="kpi-val">99.1<span className="u">%</span></div><div className="kpi-delta up">↗ +0.2%</div><div className="kpi-target">Target 99.5%</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('INVENTORY DAYS OF SUPPLY', '18 days', 'Target 16 days', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Inventory Days of Supply</span><span className="kpi-ico">📦</span></div><div className="kpi-val">18<span className="u">days</span></div><div className="kpi-delta up">↗ -1</div><div className="kpi-target">Target 16 days</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('YARD TURN TIME', '46 min', 'Target 40 min', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Yard Turn Time</span><span className="kpi-ico">🔄</span></div><div className="kpi-val">46<span className="u">min</span></div><div className="kpi-delta up">↗ -4min</div><div className="kpi-target">Target 40 min</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('CROSS-DOCK RATIO', '37%', 'Target 35%', 'ON TARGET', 'on')}><span className="badge on">ON TARGET</span><div className="kpi-head"><span className="kpi-title">Cross-Dock Ratio</span><span className="kpi-ico">↔️</span></div><div className="kpi-val">37<span className="u">%</span></div><div className="kpi-delta up">↗ +5%</div><div className="kpi-target">Target 35%</div></div>
            </div>
            <div className="panel">
              <div className="mini-title">Hub Throughput (loads / day)</div>
              <MeterRow label="Chicago Hub" pct={100} color="var(--blue)" />
              <MeterRow label="Atlanta DC" pct={86} color="var(--blue)" />
              <MeterRow label="Dallas DC" pct={78} color="var(--blue)" />
              <MeterRow label="Los Angeles Hub" pct={64} color="var(--blue)" />
              <MeterRow label="Memphis Hub" pct={41} color="var(--blue)" />
              <MeterRow label="Seattle Hub" pct={38} color="var(--blue)" />
            </div>
          </div>
        )}

        {/* VIEW: Route Optimization */}
        {activeTab === 'routes' && (
          <div>
            <div className="section-lead">
              <h3>Route Optimization</h3>
              <p>Planned vs actual routing efficiency and savings from the optimizer.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · Optimizer active · 2,140 routes planned today · $126K saved this month
            </div>
            <div className="kpi-grid four">
              <div className="kpi" onClick={() => openKpiDrawer('ROUTE ADHERENCE', '89%', 'Target 90%', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Route Adherence</span><span className="kpi-ico">🧭</span></div><div className="kpi-val">89<span className="u">%</span></div><div className="kpi-delta up">↗ +3.1%</div><div className="kpi-target">Target 90%</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('AVG STOPS PER ROUTE', '8.6', 'Target 9.0', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Avg Stops per Route</span><span className="kpi-ico">📍</span></div><div className="kpi-val">8.6</div><div className="kpi-delta up">↗ +0.4</div><div className="kpi-target">Target 9.0</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('KM SAVED (OPTIMIZER)', '142K', 'vs manual plan', 'ON TARGET', 'on')}><span className="badge on">ON TARGET</span><div className="kpi-head"><span className="kpi-title">Km Saved (Optimizer)</span><span className="kpi-ico">📉</span></div><div className="kpi-val">142<span className="u">K</span></div><div className="kpi-delta up">↗ +9%</div><div className="kpi-target">vs manual plan</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('LOAD CONSOLIDATION', '76%', 'Target 75%', 'ON TARGET', 'on')}><span className="badge on">ON TARGET</span><div className="kpi-head"><span className="kpi-title">Load Consolidation</span><span className="kpi-ico">🧩</span></div><div className="kpi-val">76<span className="u">%</span></div><div className="kpi-delta up">↗ +4%</div><div className="kpi-target">Target 75%</div></div>
            </div>
            <div className="panel">
              <div className="mini-title">Optimizer Impact by Region</div>
              <MeterRow label="Chicago zone — km saved" pct={100} color="var(--green)" />
              <MeterRow label="Atlanta zone" pct={78} color="var(--green)" />
              <MeterRow label="Dallas zone" pct={63} color="var(--green)" />
              <MeterRow label="Los Angeles zone" pct={52} color="var(--green)" />
              <MeterRow label="Memphis zone" pct={34} color="var(--green)" />
            </div>
          </div>
        )}

        {/* VIEW: Carrier Scorecards */}
        {activeTab === 'carriers' && (
          <div>
            <div className="section-lead">
              <h3>Carrier Scorecards</h3>
              <p>Performance ranking across in-house fleet and 3PL partners.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · 14 active carriers · avg scorecard 87 / 100
            </div>
            <div className="panel">
              <div className="mini-title">Carrier Scorecards</div>
              <table>
                <thead><tr><th>Carrier</th><th style={{ textAlign: 'right' }}>Loads</th><th style={{ textAlign: 'right' }}>On-Time</th><th style={{ textAlign: 'right' }}>Damage</th><th style={{ textAlign: 'right' }}>Cost Index</th><th style={{ textAlign: 'right' }}>Score</th><th>Tier</th></tr></thead>
                <tbody>
                  <tr><td><b>In-house Fleet</b></td><td className="num">48,200</td><td className="num">94.1%</td><td className="num">0.28%</td><td className="num">0.96</td><td className="num"><b>93</b></td><td><span className="pill g">Preferred</span></td></tr>
                  <tr><td><b>FedEx Freight</b></td><td className="num">35,600</td><td className="num">91.7%</td><td className="num">0.34%</td><td className="num">1.02</td><td className="num"><b>89</b></td><td><span className="pill g">Preferred</span></td></tr>
                  <tr><td><b>JB Hunt Transport</b></td><td className="num">29,400</td><td className="num">88.2%</td><td className="num">0.41%</td><td className="num">0.98</td><td className="num"><b>84</b></td><td><span className="pill a">Core</span></td></tr>
                  <tr><td><b>XPO Logistics</b></td><td className="num">20,700</td><td className="num">86.5%</td><td className="num">0.52%</td><td className="num">1.08</td><td className="num"><b>79</b></td><td><span className="pill a">Core</span></td></tr>
                  <tr><td><b>Old Dominion Freight</b></td><td className="num">13,500</td><td className="num">81.3%</td><td className="num">0.71%</td><td className="num">1.14</td><td className="num"><b>71</b></td><td><span className="pill r">Review</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: Exception Manager */}
        {activeTab === 'exceptions' && (
          <div>
            <div className="section-lead">
              <h3>Exception Manager</h3>
              <p>Categorized breakdown of everything going wrong, and the trend.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · 148 open exceptions · 62% auto-resolved this week
            </div>
            <div className="kpi-grid four">
              <div className="kpi" onClick={() => openKpiDrawer('OPEN EXCEPTIONS', '148', 'vs 160 yesterday', 'ACTIVE', 'near')}><div className="kpi-head"><span className="kpi-title">Open Exceptions</span><span className="kpi-ico">⚠️</span></div><div className="kpi-val">148</div><div className="kpi-delta up">↗ -12</div><div className="kpi-target">vs 160 yesterday</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('AUTO-RESOLVED EXCEPTIONS', '62%', 'Target 60%', 'ON TARGET', 'on')}><div className="kpi-head"><span className="kpi-title">Auto-Resolved</span><span className="kpi-ico">🤖</span></div><div className="kpi-val">62<span className="u">%</span></div><div className="kpi-delta up">↗ +7%</div><div className="kpi-target">Target 60%</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('REPEAT EXCEPTIONS', '23', 'same root cause', 'WATCH', 'near')}><div className="kpi-head"><span className="kpi-title">Repeat Exceptions</span><span className="kpi-ico">🔁</span></div><div className="kpi-val">23</div><div className="kpi-delta up">↗ -4</div><div className="kpi-target">same root cause</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('AVG TIME TO RESOLVE', '42 min', 'Target 45 min', 'ON TARGET', 'on')}><div className="kpi-head"><span className="kpi-title">Avg Time to Resolve</span><span className="kpi-ico">⏲️</span></div><div className="kpi-val">42<span className="u">min</span></div><div className="kpi-delta up">↗ -8min</div><div className="kpi-target">Target 45 min</div></div>
            </div>
            <div className="panel">
              <div className="mini-title">Exceptions by Category</div>
              <MeterRow label="Delivery delays" pct={100} color="var(--red)" />
              <MeterRow label="Address / POD issues" pct={64} color="var(--amber)" />
              <MeterRow label="Damage claims" pct={48} color="var(--amber)" />
              <MeterRow label="Customs / documentation" pct={39} color="var(--amber)" />
              <MeterRow label="Temperature excursions" pct={22} color="var(--red)" />
              <MeterRow label="Lost / misrouted" pct={14} color="var(--red)" />
            </div>
          </div>
        )}

        {/* VIEW: Sustainability */}
        {activeTab === 'sustainability' && (
          <div>
            <div className="section-lead">
              <h3>Sustainability</h3>
              <p>Emissions intensity and progress toward network decarbonization targets.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · YTD CO₂ 42,100 tonnes · 8% below plan
            </div>
            <div className="kpi-grid four">
              <div className="kpi" onClick={() => openKpiDrawer('CO₂ PER TONNE-KM', '62g', 'Target 58 g', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">CO₂ per Tonne-Km</span><span className="kpi-ico">🌱</span></div><div className="kpi-val">62<span className="u">g</span></div><div className="kpi-delta up">↗ -4.1%</div><div className="kpi-target">Target 58 g</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('TOTAL EMISSIONS (YTD)', '42.1kt', 'Plan 45.8 kt', 'ON TARGET', 'on')}><span className="badge on">ON TARGET</span><div className="kpi-head"><span className="kpi-title">Total Emissions (YTD)</span><span className="kpi-ico">🏭</span></div><div className="kpi-val">42.1<span className="u">kt</span></div><div className="kpi-delta up">↗ -8%</div><div className="kpi-target">Plan 45.8 kt</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('EV / ALT-FUEL SHARE', '11%', 'Target 15%', 'BELOW TARGET', 'below')}><span className="badge below">BELOW TARGET</span><div className="kpi-head"><span className="kpi-title">EV / Alt-Fuel Share</span><span className="kpi-ico">🔋</span></div><div className="kpi-val">11<span className="u">%</span></div><div className="kpi-delta up">↗ +3%</div><div className="kpi-target">Target 15%</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('EMPTY-MILE EMISSIONS', '14.8%', 'Target 12%', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Empty-Mile Emissions</span><span className="kpi-ico">↩️</span></div><div className="kpi-val">14.8<span className="u">%</span></div><div className="kpi-delta up">↗ -1.9%</div><div className="kpi-target">Target 12%</div></div>
            </div>
            <div className="panel">
              <div className="mini-title">Emissions by Mode (share of total)</div>
              <MeterRow label="Road (FTL)" pct={100} color="var(--ink-soft)" />
              <MeterRow label="Road (LTL)" pct={52} color="var(--ink-soft)" />
              <MeterRow label="Air" pct={44} color="var(--red)" />
              <MeterRow label="Ocean" pct={29} color="var(--ink-soft)" />
              <MeterRow label="Rail" pct={11} color="var(--green)" />
            </div>
          </div>
        )}

        {/* VIEW: Demand Forecast */}
        {activeTab === 'forecast' && (
          <div>
            <div className="section-lead">
              <h3>Demand Forecast</h3>
              <p>AI-projected volume and capacity needs for the next planning horizon.</p>
            </div>
            <div className="live">
              <span className="dot" />
              <b>LIVE</b> · Models retrained 6h ago · MAPE 7.2% · next 30-day horizon
            </div>
            <div className="kpi-grid four">
              <div className="kpi" onClick={() => openKpiDrawer('FORECAST ACCURACY (MAPE)', '92.8%', 'Target 93%', 'NEAR TARGET', 'near')}><span className="badge near">NEAR TARGET</span><div className="kpi-head"><span className="kpi-title">Forecast Accuracy (MAPE)</span><span className="kpi-ico">🎯</span></div><div className="kpi-val">92.8<span className="u">%</span></div><div className="kpi-delta up">↗ +1.4%</div><div className="kpi-target">Target 93%</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('PROJECTED VOLUME (30D)', '198K', 'vs 184.5K actual', 'ON TARGET', 'on')}><span className="badge on">ON TARGET</span><div className="kpi-head"><span className="kpi-title">Projected Volume (30d)</span><span className="kpi-ico">📈</span></div><div className="kpi-val">198<span className="u">K</span></div><div className="kpi-delta up">↗ +7.3%</div><div className="kpi-target">vs 184.5K actual</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('CAPACITY GAP', '6.4%', 'needs +40 vehicles', 'BELOW TARGET', 'below')}><span className="badge below">BELOW TARGET</span><div className="kpi-head"><span className="kpi-title">Capacity Gap</span><span className="kpi-ico">⚖️</span></div><div className="kpi-val">6.4<span className="u">%</span></div><div className="kpi-delta down">↘ +2.1%</div><div className="kpi-target">needs +40 vehicles</div></div>
              <div className="kpi" onClick={() => openKpiDrawer('PEAK-DAY LOAD', '9,120', 'Apr 24 projected', 'HIGH VOLUME', 'on')}><div className="kpi-head"><span className="kpi-title">Peak-Day Load</span><span className="kpi-ico">🔺</span></div><div className="kpi-val">9,120</div><div className="kpi-delta up">↗ +12%</div><div className="kpi-target">Apr 24 projected</div></div>
            </div>
            <div className="panel">
              <div className="mini-title">Projected Volume by Region (next 30 days)</div>
              <MeterRow label="Midwest (Chicago/Detroit)" pct={100} color="var(--blue)" />
              <MeterRow label="Southeast (Atlanta/Charlotte)" pct={84} color="var(--blue)" />
              <MeterRow label="West (Los Angeles/Seattle)" pct={71} color="var(--blue)" />
              <MeterRow label="Northeast (New York/Boston)" pct={46} color="var(--blue)" />
              <MeterRow label="Southwest (Dallas/Houston)" pct={38} color="var(--blue)" />
            </div>
          </div>
        )}
      </div>

      {/* SIDE DRAWER: KPI Definition, Formula, Trend & Data Lineage */}
      {showKpiDrawer && selectedKpiData && (
        <div className="fi-drawer-overlay" onClick={() => setShowKpiDrawer(false)}>
          <div className="fi-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="fi-drawer-head">
              <div>
                <div className="fi-drawer-title-group">
                  <span className="fi-drawer-ico">{selectedKpiData.icon}</span>
                  <div className="fi-drawer-title">
                    <h3>{selectedKpiData.title}</h3>
                  </div>
                </div>
                <div className="fi-drawer-val-row">
                  <span className="fi-drawer-val">{selectedKpiData.value}</span>
                  <span className={`kpi-delta ${selectedKpiData.deltaClass}`}>{selectedKpiData.delta}</span>
                  <span className={`badge ${selectedKpiData.badgeClass}`}>{selectedKpiData.badge}</span>
                </div>
                <div className="fi-kpi-target" style={{ marginTop: '4px' }}>{selectedKpiData.target}</div>
              </div>
              <button className="fi-drawer-close" onClick={() => setShowKpiDrawer(false)}>✕</button>
            </div>

            {/* Drawer Body */}
            <div className="fi-drawer-body">
              {/* Section 1: Definition */}
              <div className="fi-drawer-card">
                <div className="fi-drawer-card-title">📘 Operational Definition &amp; Scope</div>
                <p className="fi-drawer-desc">{selectedKpiData.definition}</p>
              </div>

              {/* Section 2: Mathematical Formula */}
              <div className="fi-drawer-card">
                <div className="fi-drawer-card-title">🧮 Mathematical Formula &amp; Calculation</div>
                <div className="fi-drawer-formula-box">
                  <code>{selectedKpiData.formula}</code>
                </div>
                {selectedKpiData.formulaVars && selectedKpiData.formulaVars.length > 0 && (
                  <div className="fi-drawer-var-list">
                    {selectedKpiData.formulaVars.map((v, i) => (
                      <div key={i} className="fi-drawer-var-item">
                        <span className="fi-drawer-var-tag">{v.name}</span>
                        <span className="fi-drawer-desc">{v.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Trend Analysis & Driver Breakdown */}
              <div className="fi-drawer-card">
                <div className="fi-drawer-card-title">📈 30-Day Trend Analysis &amp; Drivers</div>
                <p className="fi-drawer-desc"><b>{selectedKpiData.trend.summary}</b></p>
                <div style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 700, background: '#eef3ff', padding: '4px 10px', borderRadius: '6px', width: 'fit-content' }}>
                  {selectedKpiData.trend.periodChange}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {selectedKpiData.trend.drivers.map((d, i) => (
                    <div key={i} className="fi-drawer-driver-item">
                      <span className="fi-drawer-driver-ico">{d.type === 'positive' ? '🟢' : '🔴'}</span>
                      <span>{d.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Data Lineage & Pipeline Architecture */}
              <div className="fi-drawer-card">
                <div className="fi-drawer-card-title">⛓️ Data Lineage &amp; Pipeline Health</div>
                <div className="fi-drawer-lineage-grid">
                  <div className="fi-drawer-lineage-item">
                    <label>SOURCE SYSTEMS</label>
                    <span>{selectedKpiData.lineage.sourceSystems.join(', ')}</span>
                  </div>
                  <div className="fi-drawer-lineage-item">
                    <label>TARGET TABLES</label>
                    <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{selectedKpiData.lineage.tables.join(', ')}</span>
                  </div>
                  <div className="fi-drawer-lineage-item">
                    <label>SYNC FREQUENCY</label>
                    <span>{selectedKpiData.lineage.syncFrequency}</span>
                  </div>
                  <div className="fi-drawer-lineage-item">
                    <label>DATA OWNER</label>
                    <span>{selectedKpiData.lineage.owner}</span>
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span>🟢 Pipeline Health:</span>
                  <b>{selectedKpiData.lineage.pipelineStatus}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Signal Detail */}
      {showDetailModal && currentSignal && (
        <div className="fi-modal-overlay">
          <div className="fi-modal-box">
            <div className="fi-modal-head">
              <div>
                <span className={`fi-sev ${currentSignal.severity}`}>{currentSignal.severity}</span>
                <span className="fi-sig-ref" style={{ marginLeft: '10px' }}>{currentSignal.refCode}</span>
              </div>
              <button className="fi-btn" style={{ flex: 'none' }} onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="fi-modal-body">
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{currentSignal.title}</h3>
              <p className="fi-modal-subtext">{currentSignal.detail}</p>
              
              <div className="fi-sig-impact">
                <span>Estimated Network Impact:</span>
                <b>{currentSignal.impact}</b>
              </div>

              <div className="fi-trigger-box">
                <b className="lbl">AI Trigger Context</b>
                <p>{currentSignal.trigger}</p>
              </div>

              <div className="fi-rect-box">
                <b className="lbl">Recommended Rectification</b>
                <p>{currentSignal.rectification}</p>
              </div>
            </div>
            <div className="fi-modal-foot">
              <button className="fi-btn" onClick={openComposerFromDetail}>✉ Send Executive Alert</button>
              <button className="fi-btn" onClick={openResolveFromDetail}>Escalate &amp; Resolve</button>
              <button className="fi-btn primary" onClick={() => { toggleAck(currentSignal.id); setShowDetailModal(false); }}>
                {currentSignal.ack ? '✓ Acknowledged' : 'Acknowledge Signal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Resolve Signal Ticket */}
      {showResolveModal && (
        <div className="fi-modal-overlay">
          <div className="fi-modal-box">
            <div className="fi-modal-head">
              <h3>Resolve &amp; Assign Triage Ticket</h3>
              <button className="fi-btn" style={{ flex: 'none' }} onClick={() => setShowResolveModal(false)}>×</button>
            </div>
            <div className="fi-modal-body">
              <div>
                <label className="fi-modal-label">Assign To</label>
                <select className="fi-modal-field" value={resolveAssignee} onChange={e => setResolveAssignee(e.target.value)}>
                  <option>Rohan Mehta (Category Manager)</option>
                  <option>S. Iyer (Ops Lead)</option>
                  <option>M. Patel (Regional Director)</option>
                </select>
              </div>
              <div>
                <label className="fi-modal-label">Resolution Notes</label>
                <textarea className="fi-modal-field textarea" value={resolveNote} onChange={e => setResolveNote(e.target.value)} />
              </div>
            </div>
            <div className="fi-modal-foot">
              <button className="fi-btn" onClick={() => setShowResolveModal(false)}>Cancel</button>
              <button className="fi-btn primary" onClick={confirmResolve}>Submit Resolution</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Compose Executive Alert */}
      {showComposerModal && (
        <div className="fi-modal-overlay">
          <div className="fi-modal-box">
            <div className="fi-modal-head">
              <h3>Compose Executive Communication</h3>
              <button className="fi-btn" style={{ flex: 'none' }} onClick={() => setShowComposerModal(false)}>×</button>
            </div>
            <div className="fi-modal-body">
              <div>
                <label className="fi-modal-label">Recipient</label>
                <input type="text" className="fi-modal-field" value={composerRecipient} onChange={e => setComposerRecipient(e.target.value)} />
              </div>
              <div>
                <label className="fi-modal-label">Subject</label>
                <input type="text" className="fi-modal-field" value={composerSubject} onChange={e => setComposerSubject(e.target.value)} />
              </div>
              <div>
                <label className="fi-modal-label">Message</label>
                <textarea className="fi-modal-field textarea" value={composerBody} onChange={e => setComposerBody(e.target.value)} />
              </div>
            </div>
            <div className="fi-modal-foot">
              <button className="fi-btn" onClick={() => setShowComposerModal(false)}>Cancel</button>
              <button className="fi-btn primary" onClick={sendComposer}>Dispatch Alert</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI Simulation */}
      {showSimModal && currentSim && (
        <div className="fi-modal-overlay">
          <div className="fi-modal-box wide">
            <div className="fi-modal-head">
              <h3>AI Predictive Simulation Workbench</h3>
              <button className="fi-btn" style={{ flex: 'none' }} onClick={() => setShowSimModal(false)}>×</button>
            </div>
            <div className="fi-modal-body">
              <div style={{ display: 'flex', gap: '8px' }}>
                {['demand', 'margin', 'stockout', 'elasticity'].map(t => (
                  <button
                    key={t}
                    className={`fi-btn ${simTab === t ? 'primary' : ''}`}
                    onClick={() => setSimTab(t)}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="fi-sim-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <b style={{ fontSize: '15px' }}>{currentSim.title}</b>
                  <span style={{ color: currentSim.tagColor, fontWeight: 700 }}>{currentSim.tag}</span>
                </div>
                <p className="fi-modal-subtext" style={{ marginBottom: '14px' }}>{currentSim.text}</p>
                <div className="fi-risk-track" style={{ height: '8px' }}>
                  <span style={{ width: `${currentSim.pct}%`, background: currentSim.barColor }} />
                </div>
                <div className="fi-risk-stat" style={{ marginTop: '8px' }}>
                  <span>{currentSim.left}</span>
                  <b>{currentSim.right}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Prediction Details */}
      {showPredictionModal && currentPrediction && (
        <div className="fi-modal-overlay">
          <div className="fi-modal-box wide">
            <div className="fi-modal-head">
              <h3>AI Prediction Deep Dive</h3>
              <button className="fi-btn" style={{ flex: 'none' }} onClick={() => setShowPredictionModal(false)}>×</button>
            </div>
            <div className="fi-modal-body">
              <div className="fi-pred-target-banner">
                <div>
                  <div className="sub-lbl">TARGET OBJECT</div>
                  <div className="main-val">{currentPrediction.targetObject}</div>
                  <div className="desc-text">{currentPrediction.targetDesc}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="sub-lbl">PROBABILITY</div>
                  <div className="prob-val">{currentPrediction.probability}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="fi-pred-card">
                  <b style={{ color: '#d97706', fontSize: '13px' }}>Why was this predicted?</b>
                  <ul className="fi-pred-list">
                    {currentPrediction.why.map((w, idx) => (
                      <li key={idx}><b>{w.strong}</b> {w.text}</li>
                    ))}
                  </ul>
                </div>
                <div className="fi-pred-card">
                  <b style={{ color: '#7c3aed', fontSize: '13px' }}>How was it calculated?</b>
                  <p className="fi-modal-subtext" style={{ marginTop: '8px' }}>{currentPrediction.how.model}</p>
                  <span style={{ fontSize: '11px', opacity: 0.7, display: 'block', marginTop: '6px' }}>Model: {currentPrediction.how.modelKey}</span>
                </div>
              </div>

              <div className="fi-pred-rec-container">
                <b className="rec-title">Recommendations &amp; Action Plan</b>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                  {currentPrediction.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`fi-pred-rec-card ${activeRecIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveRecIndex(activeRecIndex === idx ? null : idx)}
                    >
                      <span className="tag-lbl">{rec.tag}</span>
                      <h5 style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{rec.title}</h5>
                      <p className="desc">{rec.desc}</p>
                    </div>
                  ))}
                </div>
                {activeRecIndex !== null && currentPrediction.recommendations[activeRecIndex] && (
                  <div className="fi-pred-steps-box">
                    <b style={{ fontSize: '12px' }}>Execution Steps:</b>
                    <ol className="steps-list">
                      {currentPrediction.recommendations[activeRecIndex].steps.map((st, sIdx) => (
                        <li key={sIdx}>{st}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications rendering */}
      <div className="fi-toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`fi-toast ${t.color}`}>
            <b>{t.title}</b>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
