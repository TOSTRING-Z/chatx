import { Client } from 'ssh2'
import type { ConnectConfig, ClientChannel } from 'ssh2'
import type { Buffer } from 'buffer'

class SSHService {
  private client: Client
  private stream: any
  public isConnected: boolean

  constructor() {
    this.client = new Client()
    this.stream = null
    this.isConnected = false
  }

  connect(config: ConnectConfig, onData: any, onError: any, onClose: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => {
          this.isConnected = true
          this.client.shell((err: Error | undefined, stream: ClientChannel) => {
            if (err) {
              onError(err)
              return reject(err)
            }
            this.stream = stream
            stream.on('data', onData)
            stream.on('close', () => {
              this.isConnected = false
              onClose()
              this.client.end()
            })
            stream.stderr.on('data', onData)
            resolve()
          })
        })
        .on('error', (err: Error) => {
          this.isConnected = false
          onError(err)
          reject(err)
        })
        .connect(config)
    })
  }

  sendCommand(command: string): void {
    if (this.stream) {
      this.stream.write(command + '\n')
    }
  }

  disconnect(): void {
    if (this.isConnected) {
      this.isConnected = false
      this.client.end()
    }
  }
}

export { SSHService }
