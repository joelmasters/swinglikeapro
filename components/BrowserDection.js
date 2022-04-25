import { useState, useEffect } from 'react';
import Alert from 'react-bootstrap/Alert'

export default function BrowserDetection() {
  const [showWarning, setShowWarning] = useState(false);
  const [browser, setBrowser] = useState(undefined);

  useEffect(() => {
    detectBrowser();
  }, [])

  const detectBrowser = () => { 
    if((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1 ) {
      setBrowser('Opera');
      setShowWarning(true);
    } else if(navigator.userAgent.indexOf("Edg") != -1 ) {
      setBrowser('Edge');
      setShowWarning(true);
    } else if(navigator.userAgent.indexOf("Chrome") != -1 ) {
      setBrowser('Chrome');
    } else if(navigator.userAgent.indexOf("Safari") != -1) {
      setBrowser('Safari');
      setShowWarning(true);
    } else if(navigator.userAgent.indexOf("Firefox") != -1 ) {
      setBrowser('Firefox');
    } else if((navigator.userAgent.indexOf("MSIE") != -1 ) || (!!document.documentMode == true )) {
      setBrowser('IE'); 
      setShowWarning(true);
    } else {
      setBrowser('unknown');
      setShowWarning(true);
   }
  }

  if (showWarning) {
    return (
      <Alert variant="warning" onClose={() => setShowWarning(false)} dismissible>
        <p>
          Warning: your browser ({browser}) is currently unsupported. Functionality may be limited.<br />
          Currently support browsers are: Chrome and Firefox.
        </p>
      </Alert>
    );
  } else {
    return null
  }
}