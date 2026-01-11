import { defineStore } from "pinia";
import { db, type StationRecord } from "~/db/db";
import { generateUUIDv7 } from "~/utils/id";

export const useKitchenStations = defineStore("kitchen-stations", () => {
    const stations = ref<StationRecord[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Initial Seed
    const seedDefaults = async () => {
        const count = await db.stations.count();
        if (count === 0) {
            const defaults: StationRecord[] = [
                {
                    id: generateUUIDv7(),
                    name: "Kitchen",
                    description: "Main Kitchen",
                    isDefault: true,
                    synced: false,
                },
                {
                    id: generateUUIDv7(),
                    name: "Bar",
                    description: "Drinks bar",
                    isDefault: false,
                    synced: false,
                },
            ];
            await db.stations.bulkAdd(defaults);
            stations.value = defaults;
        }
    };

    // Load from DB
    const loadStations = async () => {
        loading.value = true;
        try {
            stations.value = await db.stations.toArray();
            if (stations.value.length === 0) {
                await seedDefaults();
            }
        } catch (e) {
            error.value = String(e);
            console.error("Failed to load stations", e);
        } finally {
            loading.value = false;
        }
    };

    // Add Station
    const addStation = async (station: Partial<StationRecord>) => {
        const newStation: StationRecord = {
            id: generateUUIDv7(),
            name: station.name || "New Station",
            description: station.description || "",
            printerId: station.printerId,
            isDefault: station.isDefault || false,
            synced: false,
            ...station,
        };

        if (newStation.isDefault) {
            // Unset other defaults
            await db.stations
                .filter((s) => s.isDefault === true)
                .modify({ isDefault: false });
            stations.value.forEach((s) => (s.isDefault = false));
        }

        await db.stations.add(newStation);
        stations.value.push(newStation);
        return newStation;
    };

    // Update Station
    const updateStation = async (id: string, updates: Partial<StationRecord>) => {
        if (updates.isDefault) {
            await db.stations
                .filter((s) => s.isDefault === true)
                .modify({ isDefault: false });
            stations.value.forEach((s) => (s.isDefault = false));
        }

        await db.stations.update(id, { ...updates, synced: false });
        const index = stations.value.findIndex((s) => s.id === id);
        if (index !== -1) {
            stations.value[index] = {
                ...stations.value[index],
                ...updates,
                id // Ensure ID is preserved and not undefined
            };
        }
    };

    // Delete Station
    const deleteStation = async (id: string) => {
        await db.stations.delete(id);
        stations.value = stations.value.filter((s) => s.id !== id);
    };

    return {
        stations,
        loading,
        error,
        loadStations,
        addStation,
        updateStation,
        deleteStation,
    };
});
