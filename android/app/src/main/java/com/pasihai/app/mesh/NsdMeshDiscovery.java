package com.pasihai.app.mesh;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** NSD (_pasihai._tcp). Peers only from resolve callbacks; expire after TTL. */
public class NsdMeshDiscovery {
    public static final String SERVICE_TYPE = "_pasihai._tcp.";
    public static final long PEER_TTL_MS = 15_000L;

    public static class Peer {
        public String deviceId;
        public String host;
        public int port;
        public long lastSeen;
        public String protocol;
    }

    private final NsdManager nsd;
    private final String localDeviceId;
    private NsdManager.RegistrationListener reg;
    private NsdManager.DiscoveryListener disc;
    private volatile boolean discovering;
    private volatile boolean registered;
    private final ConcurrentHashMap<String, Peer> peers = new ConcurrentHashMap<>();

    public NsdMeshDiscovery(Context ctx, String localDeviceId) {
        this.nsd = (NsdManager) ctx.getSystemService(Context.NSD_SERVICE);
        this.localDeviceId = localDeviceId;
    }

    public boolean isDiscovering() {
        return discovering;
    }

    public void register(int port) {
        if (nsd == null || registered) return;
        NsdServiceInfo info = new NsdServiceInfo();
        info.setServiceName("pasihai-" + localDeviceId);
        info.setServiceType(SERVICE_TYPE);
        info.setPort(port);
        if (Build.VERSION.SDK_INT >= 21) {
            info.setAttribute("did", localDeviceId);
            info.setAttribute("proto", "pasihai-mesh/1");
        }
        reg = new NsdManager.RegistrationListener() {
            @Override public void onRegistrationFailed(NsdServiceInfo s, int e) { registered = false; }
            @Override public void onUnregistrationFailed(NsdServiceInfo s, int e) {}
            @Override public void onServiceRegistered(NsdServiceInfo s) { registered = true; }
            @Override public void onServiceUnregistered(NsdServiceInfo s) { registered = false; }
        };
        try {
            nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, reg);
        } catch (Exception ignored) {
            registered = false;
        }
    }

    public void startDiscovery() {
        if (nsd == null || discovering) return;
        disc = new NsdManager.DiscoveryListener() {
            @Override public void onStartDiscoveryFailed(String t, int e) { discovering = false; }
            @Override public void onStopDiscoveryFailed(String t, int e) {}
            @Override public void onDiscoveryStarted(String t) { discovering = true; }
            @Override public void onDiscoveryStopped(String t) { discovering = false; }

            @Override
            public void onServiceFound(NsdServiceInfo service) {
                if (service.getServiceName() != null && service.getServiceName().contains(localDeviceId)) {
                    return;
                }
                try {
                    nsd.resolveService(service, new NsdManager.ResolveListener() {
                        @Override public void onResolveFailed(NsdServiceInfo s, int errorCode) {}

                        @Override
                        public void onServiceResolved(NsdServiceInfo s) {
                            InetAddress addr = s.getHost();
                            if (addr == null || s.getPort() <= 0) return;
                            Peer p = new Peer();
                            p.host = addr.getHostAddress();
                            p.port = s.getPort();
                            p.lastSeen = System.currentTimeMillis();
                            p.protocol = "pasihai-mesh/1";
                            p.deviceId = s.getServiceName();
                            if (Build.VERSION.SDK_INT >= 21) {
                                Map<String, byte[]> attrs = s.getAttributes();
                                if (attrs != null && attrs.get("did") != null) {
                                    p.deviceId = new String(attrs.get("did"), StandardCharsets.UTF_8);
                                }
                            }
                            if (localDeviceId.equals(p.deviceId)) return;
                            peers.put(p.host + ":" + p.port, p);
                        }
                    });
                } catch (Exception ignored) {}
            }

            @Override
            public void onServiceLost(NsdServiceInfo service) {
                // expiry handles stale peers; do not invent replacements
            }
        };
        try {
            nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, disc);
        } catch (Exception e) {
            discovering = false;
        }
    }

    public void stop() {
        if (nsd == null) return;
        try {
            if (disc != null) nsd.stopServiceDiscovery(disc);
        } catch (Exception ignored) {}
        try {
            if (reg != null) nsd.unregisterService(reg);
        } catch (Exception ignored) {}
        discovering = false;
        registered = false;
        peers.clear();
    }

    public JSONObject listJson() throws JSONException {
        long now = System.currentTimeMillis();
        JSONArray arr = new JSONArray();
        Iterator<Map.Entry<String, Peer>> it = peers.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Peer> e = it.next();
            Peer p = e.getValue();
            if (now - p.lastSeen > PEER_TTL_MS) {
                it.remove();
                continue;
            }
            JSONObject o = new JSONObject();
            o.put("deviceId", p.deviceId);
            o.put("host", p.host);
            o.put("port", p.port);
            o.put("lastSeen", p.lastSeen);
            o.put("protocol", p.protocol);
            o.put("transport", "lan-nsd");
            arr.put(o);
        }
        JSONObject ret = new JSONObject();
        ret.put("peers", arr);
        ret.put("discovering", discovering);
        if (!discovering) ret.put("reason", "discovery_idle");
        else if (arr.length() == 0) ret.put("reason", "no_peers_seen");
        else ret.put("reason", JSONObject.NULL);
        return ret;
    }
}
