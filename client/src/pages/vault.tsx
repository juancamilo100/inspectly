import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MapPin, Home, Eye, FileCheck, CheckCircle, XCircle, Clock, MoreVertical, Trash2, Edit, Map, List } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

interface VaultData {
  properties: Property[];
}

const statusConfig = {
  watching: { label: "Watching", icon: Eye, color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  offer_pending: { label: "Offer Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  under_contract: { label: "Under Contract", icon: FileCheck, color: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  closed: { label: "Closed", icon: CheckCircle, color: "bg-green-500/10 text-green-500 border-green-500/30" },
  passed: { label: "Passed", icon: XCircle, color: "bg-muted text-muted-foreground" },
};

export default function VaultPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [newStatus, setNewStatus] = useState<string>("watching");
  const [newNotes, setNewNotes] = useState("");
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<VaultData>({
    queryKey: ['/api/properties'],
  });

  const createMutation = useMutation({
    mutationFn: async (property: { address: string; city?: string; state?: string; latitude?: string; longitude?: string; status: string; notes?: string }) => {
      return apiRequest('POST', '/api/properties', property);
    },
    onSuccess: () => {
      toast({ title: "Property added!", description: "Property has been added to your vault." });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add property", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; status?: string; notes?: string; latitude?: string; longitude?: string }) => {
      return apiRequest('PATCH', `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Property updated!" });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setEditingProperty(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update property", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/properties/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Property removed" });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete property", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewAddress("");
    setNewCity("");
    setNewState("");
    setNewLatitude("");
    setNewLongitude("");
    setNewStatus("watching");
    setNewNotes("");
  };

  const handleSubmit = () => {
    if (!newAddress.trim()) {
      toast({ title: "Address required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      address: newAddress,
      city: newCity || undefined,
      state: newState || undefined,
      latitude: newLatitude || undefined,
      longitude: newLongitude || undefined,
      status: newStatus,
      notes: newNotes || undefined,
    });
  };

  // Initialize map when in map view
  useEffect(() => {
    if (viewMode !== "map" || !mapContainerRef.current || mapRef.current) return;

    // Fix for Leaflet default marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapContainerRef.current).setView([39.8283, -98.5795], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [viewMode]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !data?.properties) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add markers for properties with coordinates
    const propertiesWithCoords = data.properties.filter(p => p.latitude && p.longitude);
    propertiesWithCoords.forEach(property => {
      const lat = parseFloat(property.latitude!);
      const lng = parseFloat(property.longitude!);
      if (!isNaN(lat) && !isNaN(lng)) {
        const status = statusConfig[property.status as keyof typeof statusConfig] || statusConfig.watching;
        const marker = L.marker([lat, lng]).addTo(mapRef.current!);
        marker.bindPopup(`
          <div style="min-width: 150px;">
            <strong>${property.address}</strong><br/>
            <span style="font-size: 12px;">${status.label}</span>
            ${property.notes ? `<br/><span style="font-size: 11px; color: #666;">${property.notes}</span>` : ''}
          </div>
        `);
      }
    });

    // Fit bounds if we have properties
    if (propertiesWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        propertiesWithCoords.map(p => [parseFloat(p.latitude!), parseFloat(p.longitude!)] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [data?.properties, viewMode]);

  const getStatusCounts = () => {
    if (!data?.properties) return { watching: 0, offer_pending: 0, under_contract: 0, closed: 0, passed: 0 };
    return data.properties.reduce((acc, p) => {
      const status = p.status as keyof typeof acc;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, { watching: 0, offer_pending: 0, under_contract: 0, closed: 0, passed: 0 });
  };

  const counts = getStatusCounts();

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Home className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to load vault</h2>
            <p className="text-muted-foreground text-sm">Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Home className="w-6 h-6" />
            Digital Vault
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your property pipeline and deal progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "map" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setViewMode("map")}
              data-testid="button-view-map"
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-property">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          const count = counts[key as keyof typeof counts] || 0;
          return (
            <Card key={key} className={count > 0 ? "border-primary/20" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color.split(' ')[0]}`}>
                    <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono" data-testid={`count-${key}`}>{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Property Map
            </CardTitle>
            <CardDescription>
              Properties with coordinates are shown on the map. Add latitude/longitude when creating properties.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapContainerRef} 
              className="w-full h-[400px] rounded-lg border"
              data-testid="map-container"
            />
          </CardContent>
        </Card>
      )}

      {/* Properties List */}
      {viewMode === "list" && (
        <Card>
        <CardHeader>
          <CardTitle>Your Properties</CardTitle>
          <CardDescription>
            {data?.properties.length === 0 
              ? "Add properties to track your deal pipeline"
              : `${data?.properties.length} properties in your vault`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : data?.properties && data.properties.length > 0 ? (
            <div className="space-y-3">
              {data.properties.map((property) => {
                const status = statusConfig[property.status as keyof typeof statusConfig] || statusConfig.watching;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={property.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover-elevate"
                    data-testid={`property-card-${property.id}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{property.address}</p>
                          {(property.city || property.state) && (
                            <p className="text-sm text-muted-foreground">
                              {[property.city, property.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-menu-${property.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingProperty(property)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Status
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteMutation.mutate(property.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {property.notes && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {property.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Added {new Date(property.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Home className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No properties yet</p>
              <p className="text-sm mt-1">Add your first property to start tracking deals</p>
              <Button 
                className="mt-4" 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(true)}
                data-testid="button-add-property-empty"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Add Property Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Property to Vault</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="address">Property Address</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                data-testid="input-property-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  data-testid="input-property-city"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  data-testid="input-property-state"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude (optional)</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 40.7128"
                  value={newLatitude}
                  onChange={(e) => setNewLatitude(e.target.value)}
                  data-testid="input-property-latitude"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude (optional)</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g. -74.0060"
                  value={newLongitude}
                  onChange={(e) => setNewLongitude(e.target.value)}
                  data-testid="input-property-longitude"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Add coordinates to show this property on the map view
            </p>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-property-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any notes about this property..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                data-testid="input-property-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              data-testid="button-submit-property"
            >
              {createMutation.isPending ? "Adding..." : "Add Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Property Status</DialogTitle>
          </DialogHeader>
          {editingProperty && (
            <div className="space-y-4 py-4">
              <p className="font-medium">{editingProperty.address}</p>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editingProperty.status} 
                  onValueChange={(status) => setEditingProperty({ ...editingProperty, status })}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProperty(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingProperty && updateMutation.mutate({ id: editingProperty.id, status: editingProperty.status })}
              disabled={updateMutation.isPending}
              data-testid="button-save-status"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
