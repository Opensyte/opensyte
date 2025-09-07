import {
  getAllRequiredPermissionNames,
  getPermissionMetadata,
} from "~/lib/rbac";

/**
 * Utility to analyze permission synchronization status
 */
export class PermissionSyncAnalyzer {
  /**
   * Compare database permissions with RBAC library definitions
   */
  static analyzeSyncStatus(
    dbPermissions: Array<{
      name: string;
      description: string | null;
      module: string;
      action: string;
    }>
  ) {
    const dbPermissionNames = new Set(dbPermissions.map(p => p.name));
    const requiredPermissionNames = getAllRequiredPermissionNames();

    // Find permissions to add (exist in RBAC lib but not in DB)
    const permissionsToAdd = requiredPermissionNames
      .filter(name => !dbPermissionNames.has(name))
      .map(name => getPermissionMetadata(name));

    // Find permissions to remove (exist in DB but not in RBAC lib)
    const permissionsToRemove = dbPermissions.filter(
      p => !requiredPermissionNames.includes(p.name)
    );

    // Find permissions to update (exist in both but have different details)
    const permissionsToUpdate = requiredPermissionNames
      .filter(name => {
        const existing = dbPermissions.find(dbp => dbp.name === name);
        if (!existing) return false;

        const expected = getPermissionMetadata(name);
        return (
          existing.description !== expected.description ||
          existing.module !== expected.module ||
          existing.action !== expected.action
        );
      })
      .map(name => getPermissionMetadata(name));

    // Calculate sync statistics
    const totalRequired = requiredPermissionNames.length;
    const totalInDb = dbPermissions.length;
    const matched = totalRequired - permissionsToAdd.length;

    return {
      needsSync:
        permissionsToAdd.length > 0 ||
        permissionsToRemove.length > 0 ||
        permissionsToUpdate.length > 0,
      statistics: {
        totalRequired,
        totalInDb,
        matched,
        toAdd: permissionsToAdd.length,
        toRemove: permissionsToRemove.length,
        toUpdate: permissionsToUpdate.length,
        syncPercentage: Math.round((matched / totalRequired) * 100),
      },
      changes: {
        permissionsToAdd,
        permissionsToRemove,
        permissionsToUpdate,
      },
    };
  }

  /**
   * Get permission modules that need attention
   */
  static getModulesNeedingSync(
    dbPermissions: Array<{
      name: string;
      description: string | null;
      module: string;
      action: string;
    }>
  ) {
    const analysis = this.analyzeSyncStatus(dbPermissions);

    if (!analysis.needsSync) {
      return [];
    }

    const modulesNeedingSync = new Set<string>();

    analysis.changes.permissionsToAdd.forEach(p =>
      modulesNeedingSync.add(p.module)
    );
    analysis.changes.permissionsToUpdate.forEach(p =>
      modulesNeedingSync.add(p.module)
    );
    analysis.changes.permissionsToRemove.forEach(p =>
      modulesNeedingSync.add(p.module)
    );

    return Array.from(modulesNeedingSync).sort();
  }
}

export default PermissionSyncAnalyzer;
