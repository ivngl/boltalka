import { useState } from "react";

interface TestResult {
  step: string;
  success: boolean;
  message: string;
}

export default function WebRTCTestPanel() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (step: string, success: boolean, message: string) => {
    setResults(prev => [...prev, { step, success, message }]);
  };

  const testWebRTCSupport = async () => {
    if (!window.RTCPeerConnection) {
      addResult("WebRTC Support", false, "WebRTC not supported");
      return false;
    }
    addResult("WebRTC Support", true, "✓ WebRTC supported");
    return true;
  };

  const testMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      stream.getTracks().forEach(t => t.stop());
      addResult("Media Permissions", true, "✓ Camera/mic permissions granted");
      return true;
    } catch (err: any) {
      addResult("Media Permissions", false, `✗ Permission denied: ${err.message}`);
      return false;
    }
  };

  const testTURNConfiguration = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addResult("TURN Config", false, "No auth token");
        return false;
      }
      
      const response = await fetch("/api/turn-config", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        addResult("TURN Config", false, `HTTP ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      if (!data) {
        addResult("TURN Config", false, "TURN not configured");
        return false;
      }
      
      addResult("TURN Config", true, `✓ TURN: ${data.url}`);
      return true;
    } catch (err: any) {
      addResult("TURN Config", false, `Error: ${err.message}`);
      return false;
    }
  };

  const testICEConnectivity = async () => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      
      let candidates = 0;
      pc.onicecandidate = (e) => {
        if (e.candidate) candidates++;
      };
      
      pc.createDataChannel("test");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      pc.close();
      
      addResult("ICE Connectivity", true, `✓ ${candidates} ICE candidates`);
      return true;
    } catch (err: any) {
      addResult("ICE Connectivity", false, `Error: ${err.message}`);
      return false;
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    
    const tests = [
      testWebRTCSupport,
      testMediaPermissions,
      testTURNConfiguration,
      testICEConnectivity
    ];
    
    for (const test of tests) {
      await test();
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setTesting(false);
  };

  return (
    <div style={styles.panel}>
      <h3 style={styles.title}>WebRTC Test</h3>
      <button 
        onClick={runAllTests} 
        disabled={testing}
        style={styles.button}
      >
        {testing ? "Testing..." : "Run Tests"}
      </button>
      
      <div style={styles.results}>
        {results.map((result, index) => (
          <div 
            key={index} 
            style={{
              ...styles.result,
              ...(result.success ? styles.success : styles.error)
            }}
          >
            <div style={styles.resultHeader}>
              <strong>{result.step}</strong>
              <span>{result.success ? '✓' : '✗'}</span>
            </div>
            <div>{result.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    margin: '20px 0',
    fontFamily: 'system-ui, sans-serif'
  },
  title: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#333'
  },
  button: {
    padding: '10px 16px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500' as const
  },
  results: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  result: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '12px'
  },
  success: {
    background: '#e8f5e9',
    borderColor: '#28a745'
  },
  error: {
    background: '#f8d7da',
    borderColor: '#dc3545'
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px'
  }
};