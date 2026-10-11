// Test-only shim: supabase-js (realtime) inahitaji WebSocket ya asili kwenye Node < 22.
// Browser ina WebSocket yake; shim hii inatumika kwenye bundle ya majaribio pekee.
// Hakuna muunganisho unaofanyika: realtime haijajiunga na channel yoyote kwenye majaribio.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class TestWebSocketShim {
    constructor() {
      throw new Error('WebSocket imezimwa kwenye majaribio ya Cloudinary')
    }
  }
}
