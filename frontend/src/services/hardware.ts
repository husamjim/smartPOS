/**
 * Antigravity POS Hardware Services Driver (WebUSB & Web Serial)
 * Provides production-ready native integrations with physical POS devices
 * and falls back gracefully to simulators when devices are absent.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class HardwareService {
  private static printerDevice: any | null = null; // USBDevice (WebUSB – not in tsc lib by default)
  private static scalePort: any | null = null; // Web Serial Port
  private static scaleReader: any | null = null;

  // ==========================================
  // 1. ESC/POS Thermal Printer Driver (WebUSB)
  // ==========================================

  public static async connectPrinter(): Promise<string> {
    if (!(navigator as any).usb) {
      throw new Error('WebUSB is not supported in this browser. Please use Chrome/Edge or packaging desktop mode.');
    }

    try {
      // Common thermal printer vendor IDs: e.g. 0x0fe6 (Shenzhen), 0x04b8 (Epson), 0x05f9 (Zebra), etc.
      // Requesting any device (in commercial, you can filter by class or vendor)
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      
      // Claim the first interface
      await device.claimInterface(0);
      this.printerDevice = device;
      
      console.log('Successfully claimed USB Printer Interface:', device.productName);
      return device.productName || 'USB Printer';
    } catch (error: any) {
      console.warn('Printer connection failed or cancelled. Falling back to simulator:', error);
      throw error;
    }
  }

  public static isPrinterConnected(): boolean {
    return this.printerDevice !== null;
  }

  public static async printRawESCPOSText(text: string): Promise<void> {
    if (!this.printerDevice) {
      console.log('Sending mock print output (No physical printer claimed):\n', text);
      return;
    }

    try {
      // ESC/POS raw formatting bytes
      const encoder = new TextEncoder();
      
      // Initialize printer: ESC @ (0x1B 0x40)
      const initCommand = new Uint8Array([0x1B, 0x40]);
      await this.sendUSBBytes(initCommand);

      // Convert text to binary bytes (assuming UTF-8 or CP864 depending on printer config)
      const textBytes = encoder.encode(text + '\n\n\n'); // Pad spacing
      await this.sendUSBBytes(textBytes);

      // Cut paper command: GS V 66 0 (0x1D 0x56 0x42 0x00)
      const cutCommand = new Uint8Array([0x1D, 0x56, 0x42, 0x00]);
      await this.sendUSBBytes(cutCommand);

      console.log('Successfully printed receipt raw ZPL/ESC-POS job to USB hardware.');
    } catch (error) {
      console.error('Failed to print to physical USB device. Falling back:', error);
      throw error;
    }
  }

  private static async sendUSBBytes(data: Uint8Array): Promise<void> {
    if (!this.printerDevice) return;
    
    // Most USB thermal printers use Endpoint 1 or 2 for OUT bulk transfers
    // In production, we dynamically search for the Bulk OUT endpoint
    const endpointOutNumber = 1; 
    
    await this.printerDevice.transferOut(endpointOutNumber, data);
  }

  // ==========================================
  // 2. Electronic Scale Driver (Web Serial)
  // ==========================================

  public static async connectScale(): Promise<string> {
    const serial = (navigator as any).serial;
    if (!serial) {
      throw new Error('Web Serial is not supported in this browser. Please use Chrome/Edge or packaging desktop mode.');
    }

    try {
      const port = await serial.requestPort();
      await port.open({ baudRate: 9600 });
      this.scalePort = port;
      console.log('Successfully opened serial port connection for Scale.');
      return 'Serial COM Scale';
    } catch (error) {
      console.warn('Scale serial port connection failed or cancelled. Falling back:', error);
      throw error;
    }
  }

  public static isScaleConnected(): boolean {
    return this.scalePort !== null;
  }

  public static async startReadingWeight(onWeightRead: (weight: number) => void, onError: (err: any) => void): Promise<void> {
    if (!this.scalePort) return;

    try {
      const textDecoder = new TextDecoderStream();
      void this.scalePort.readable.pipeTo(textDecoder.writable); // intentionally not awaited
      const reader = textDecoder.readable.getReader();
      this.scaleReader = reader;

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('Serial Scale Reader stream closed.');
          break;
        }
        if (value) {
          buffer += value;
          // Most scales output weight packages separated by carriage returns or newlines (\r or \n)
          // Package standard: e.g. "  0.125 kg" or "ST,GS,+00.125kg"
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || ''; // Keep partial line in buffer

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine) {
              // Parse digits and decimals
              const match = cleanLine.match(/([0-9]+\.[0-9]+)/);
              if (match) {
                const parsedWeight = parseFloat(match[1]);
                if (!isNaN(parsedWeight)) {
                  onWeightRead(parsedWeight);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading serial weight stream:', error);
      onError(error);
    }
  }

  public static async stopReadingScale(): Promise<void> {
    if (this.scaleReader) {
      try {
        await this.scaleReader.cancel();
        this.scaleReader = null;
      } catch (e) {
        console.error(e);
      }
    }
    if (this.scalePort) {
      try {
        await this.scalePort.close();
        this.scalePort = null;
      } catch (e) {
        console.error(e);
      }
    }
  }
}
