import { Injectable } from '@angular/core';

import { Components } from '../enum/components.enum';
import { FinishedTask } from '../models/finished-task';
import { ImageSpec } from '../models/image-spec';
import { Task } from '../models/task';

export class TaskMessageOperation {
  running: string;
  failure: string;
  success: string;

  constructor(running: string, failure: string, success: string) {
    this.running = running;
    this.failure = failure;
    this.success = success;
  }
}

class TaskMessage {
  operation: TaskMessageOperation;
  involves: (object: any) => string;
  errors: (metadata: any) => object;

  failure(metadata: any): string {
    return $localize`Failed to ${this.operation.failure} ${this.involves(metadata)}`;
  }

  running(metadata: any): string {
    return `${this.operation.running} ${this.involves(metadata)}`;
  }

  success(metadata: any): string {
    return `${this.operation.success} ${this.involves(metadata)}`;
  }

  constructor(
    operation: TaskMessageOperation,
    involves: (metadata: any) => string,
    errors?: (metadata: any) => object
  ) {
    this.operation = operation;
    this.involves = involves;
    this.errors = errors || (() => ({}));
  }
}

@Injectable({
  providedIn: 'root'
})
export class TaskMessageService {
  defaultMessage = this.newTaskMessage(
    new TaskMessageOperation($localize`Executing`, $localize`execute`, $localize`Executed`),
    (metadata) => {
      return (
        (metadata && (Components[metadata.component] || metadata.component)) ||
        $localize`unknown task`
      );
    },
    () => {
      return {};
    }
  );

  commonOperations = {
    create: new TaskMessageOperation($localize`Creating`, $localize`create`, $localize`Created`),
    update: new TaskMessageOperation($localize`Updating`, $localize`update`, $localize`Updated`),
    delete: new TaskMessageOperation($localize`Deleting`, $localize`delete`, $localize`Deleted`),
    add: new TaskMessageOperation($localize`Adding`, $localize`add`, $localize`Added`),
    remove: new TaskMessageOperation($localize`Removing`, $localize`remove`, $localize`Removed`),
    import: new TaskMessageOperation($localize`Importing`, $localize`import`, $localize`Imported`)
  };

  rbd = {
    default: (metadata: any) => $localize`RBD '${metadata.image_spec}'`,
    create: (metadata: any) => {
      const id = new ImageSpec(
        metadata.pool_name,
        metadata.namespace,
        metadata.image_name
      ).toString();
      return $localize`RBD '${id}'`;
    },
    child: (metadata: any) => {
      const id = new ImageSpec(
        metadata.child_pool_name,
        metadata.child_namespace,
        metadata.child_image_name
      ).toString();
      return $localize`RBD '${id}'`;
    },
    destination: (metadata: any) => {
      const id = new ImageSpec(
        metadata.dest_pool_name,
        metadata.dest_namespace,
        metadata.dest_image_name
      ).toString();
      return $localize`RBD '${id}'`;
    },
    snapshot: (metadata: any) =>
      $localize`RBD snapshot '${metadata.image_spec}@${metadata.snapshot_name}'`
  };

  rbd_mirroring = {
    site_name: () => $localize`mirroring site name`,
    bootstrap: () => $localize`bootstrap token`,
    pool: (metadata: any) => $localize`mirror mode for pool '${metadata.pool_name}'`,
    pool_peer: (metadata: any) => $localize`mirror peer for pool '${metadata.pool_name}'`
  };

  grafana = {
    update_dashboards: () => $localize`all dashboards`
  };

  messages = {
    // Host tasks
    'host/add': this.newTaskMessage(this.commonOperations.add, (metadata) => this.host(metadata)),
    'host/remove': this.newTaskMessage(this.commonOperations.remove, (metadata) =>
      this.host(metadata)
    ),
    'host/identify_device': this.newTaskMessage(
      new TaskMessageOperation($localize`Identifying`, $localize`identify`, $localize`Identified`),
      (metadata) => $localize`device '${metadata.device}' on host '${metadata.hostname}'`
    ),
    // OSD tasks
    'osd/create': this.newTaskMessage(
      this.commonOperations.create,
      (metadata) => $localize`OSDs (DriveGroups: ${metadata.tracking_id})`
    ),
    'osd/delete': this.newTaskMessage(this.commonOperations.delete, (metadata) =>
      this.osd(metadata)
    ),
    // Pool tasks
    'pool/create': this.newTaskMessage(
      this.commonOperations.create,
      (metadata) => this.pool(metadata),
      (metadata) => ({
        '17': $localize`Name is already used by ${this.pool(metadata)}.`
      })
    ),
    'pool/edit': this.newTaskMessage(
      this.commonOperations.update,
      (metadata) => this.pool(metadata),
      (metadata) => ({
        '17': $localize`Name is already used by ${this.pool(metadata)}.`
      })
    ),
    'pool/delete': this.newTaskMessage(this.commonOperations.delete, (metadata) =>
      this.pool(metadata)
    ),
    // Erasure code profile tasks
    'ecp/create': this.newTaskMessage(
      this.commonOperations.create,
      (metadata) => this.ecp(metadata),
      (metadata) => ({
        '17': $localize`Name is already used by ${this.ecp(metadata)}.`
      })
    ),
    'ecp/delete': this.newTaskMessage(this.commonOperations.delete, (metadata) =>
      this.ecp(metadata)
    ),
    // Crush rule tasks
    'crushRule/create': this.newTaskMessage(
      this.commonOperations.create,
      (metadata) => this.crushRule(metadata),
      (metadata) => ({
        '17': $localize`Name is already used by ${this.crushRule(metadata)}.`
      })
    ),
    'crushRule/delete': this.newTaskMessage(this.commonOperations.delete, (metadata) =>
      this.crushRule(metadata)
    ),
    // RBD tasks
    'rbd/create': this.newTaskMessage(
      this.commonOperations.create,
      this.rbd.create,
      (metadata) => ({
        '17': $localize`Name is already used by ${this.rbd.create(metadata)}.`
      })
    ),
    'rbd/edit': this.newTaskMessage(this.commonOperations.update, this.rbd.default, (metadata) => ({
      '17': $localize`Name is already used by ${this.rbd.default(metadata)}.`
    })),
    'rbd/delete': this.newTaskMessage(
      this.commonOperations.delete,
      this.rbd.default,
      (metadata) => ({
        '16': $localize`${this.rbd.default(metadata)} is busy.`,
        '39': $localize`${this.rbd.default(metadata)} contains snapshots.`
      })
    ),
    'rbd/clone': this.newTaskMessage(
      new TaskMessageOperation($localize`Cloning`, $localize`clone`, $localize`Cloned`),
      this.rbd.child,
      (metadata) => ({
        '17': $localize`Name is already used by ${this.rbd.child(metadata)}.`,
        '22': $localize`Snapshot of ${this.rbd.child(metadata)} must be protected.`
      })
    ),
    'rbd/copy': this.newTaskMessage(
      new TaskMessageOperation($localize`Copying`, $localize`copy`, $localize`Copied`),
      this.rbd.destination,
      (metadata) => ({
        '17': $localize`Name is already used by ${this.rbd.destination(metadata)}.`
      })
    ),
    'rbd/flatten': this.newTaskMessage(
      new TaskMessageOperation($localize`Flattening`, $localize`flatten`, $localize`Flattened`),
      this.rbd.default
    ),
    // RBD snapshot tasks
    'rbd/snap/create': this.newTaskMessage(
      this.commonOperations.create,
      this.rbd.snapshot,
      (metadata) => ({
        '17': $localize`Name is already used by ${this.rbd.snapshot(metadata)}.`
      })
    ),
    'rbd/snap/edit': this.newTaskMessage(
      this.commonOperations.update,
      this.rbd.snapshot,
      (metadata) => ({
        '16': $localize`Cannot unprotect ${this.rbd.snapshot(
          metadata
        )} because it contains child images.`
      })
    ),
    'rbd/snap/delete': this.newTaskMessage(
      this.commonOperations.delete,
      this.rbd.snapshot,
      (metadata) => ({
        '16': $localize`Cannot delete ${this.rbd.snapshot(metadata)} because it's protected.`
      })
    ),
    'rbd/snap/rollback': this.newTaskMessage(
      new TaskMessageOperation(
        $localize`Rolling back`,
        $localize`rollback`,
        $localize`Rolled back`
      ),
      this.rbd.snapshot
    ),
    // RBD trash tasks
    'rbd/trash/move': this.newTaskMessage(
      new TaskMessageOperation($localize`Moving`, $localize`move`, $localize`Moved`),
      (metadata) => $localize`image '${metadata.image_spec}' to trash`,
      () => ({
        2: $localize`Could not find image.`
      })
    ),
    'rbd/trash/restore': this.newTaskMessage(
      new TaskMessageOperation($localize`Restoring`, $localize`restore`, $localize`Restored`),
      (metadata) => $localize`image '${metadata.image_id_spec}' into '${metadata.new_image_name}'`,
      (metadata) => ({
        17: $localize`Image name '${metadata.new_image_name}' is already in use.`
      })
    ),
    'rbd/trash/remove': this.newTaskMessage(
      new TaskMessageOperation($localize`Deleting`, $localize`delete`, $localize`Deleted`),
      (metadata) => $localize`image '${metadata.image_id_spec}'`
    ),
    'rbd/trash/purge': this.newTaskMessage(
      new TaskMessageOperation($localize`Purging`, $localize`purge`, $localize`Purged`),
      (metadata) => {
        let message = $localize`all pools`;
        if (metadata.pool_name) {
          message = `'${metadata.pool_name}'`;
        }
        return $localize`images from ${message}`;
      }
    ),
    // RBD mirroring tasks
    'rbd/mirroring/site_name/edit': this.newTaskMessage(
      this.commonOperations.update,
      this.rbd_mirroring.site_name,
      () => ({})
    ),
    'rbd/mirroring/bootstrap/create': this.newTaskMessage(
      this.commonOperations.create,
      this.rbd_mirroring.bootstrap,
      () => ({})
    ),
    'rbd/mirroring/bootstrap/import': this.newTaskMessage(
      this.commonOperations.import,
      this.rbd_mirroring.bootstrap,
      () => ({})
    ),
    'rbd/mirroring/pool/edit': this.newTaskMessage(
      this.commonOperations.update,
      this.rbd_mirroring.pool,
      () => ({
        16: $localize`Cannot disable mirroring because it contains a peer.`
      })
    ),
    'rbd/mirroring/peer/add': this.newTaskMessage(
      this.commonOperations.create,
      this.rbd_mirroring.pool_peer,
      () => ({})
    ),
    'rbd/mirroring/peer/edit': this.newTaskMessage(
      this.commonOperations.update,
      this.rbd_mirroring.pool_peer,
      () => ({})
    ),
    'rbd/mirroring/peer/delete': this.newTaskMessage(
      this.commonOperations.delete,
      this.rbd_mirroring.pool_peer,
      () => ({})
    ),
    // iSCSI target tasks
    'iscsi/target/create': this.newTaskMessage(this.commonOperations.create, (metadata) =>
      this.iscsiTarget(metadata)
    ),
    'iscsi/target/edit': this.newTaskMessage(this.commonOperations.update, (metadata) =>
      this.iscsiTarget(metadata)
    ),
    'iscsi/target/delete': this.newTaskMessage(this.commonOperations.delete, (metadata) =>
      this.iscsiTarget(metadata)
    ),
    'nfs/create': this.newTaskMessage(this.commonOperations.create, (metadata) =>
      this.nfs(metadata)
    ),
    'nfs/edit': this.newTaskMessage(this.commonOperations.update, (metadata) => this.nfs(metadata)),
    'nfs/delete': this.newTaskMessage(this.commonOperations.delete, (metadata) =>
      this.nfs(metadata)
    ),
    // Grafana tasks
    'grafana/dashboards/update': this.newTaskMessage(
      this.commonOperations.update,
      this.grafana.update_dashboards,
      () => ({})
    ),
    // Service tasks
    'service/create': this.newTaskMessage(this.commonOperations.create, (metadata) =>
      this.service(metadata)
    ),
    'service/delete': this.newTaskMessage(this.commonOperations.delete, (metadata) =>
      this.service(metadata)
    )
  };

  newTaskMessage(
    operation: TaskMessageOperation,
    involves: (metadata: any) => string,
    errors?: (metadata: any) => object
  ) {
    return new TaskMessage(operation, involves, errors);
  }

  host(metadata: any) {
    return $localize`host '${metadata.hostname}'`;
  }

  osd(metadata: any) {
    return $localize`OSD '${metadata.svc_id}'`;
  }

  pool(metadata: any) {
    return $localize`pool '${metadata.pool_name}'`;
  }

  ecp(metadata: any) {
    return $localize`erasure code profile '${metadata.name}'`;
  }

  crushRule(metadata: any) {
    return $localize`crush rule '${metadata.name}'`;
  }

  iscsiTarget(metadata: any) {
    return $localize`target '${metadata.target_iqn}'`;
  }

  nfs(metadata: any) {
    return $localize`NFS '${metadata.cluster_id}\:${
      metadata.export_id ? metadata.export_id : metadata.path
    }'`;
  }

  service(metadata: any) {
    return $localize`Service '${metadata.service_name}'`;
  }

  _getTaskTitle(task: Task) {
    if (task.name && task.name.startsWith('progress/')) {
      // we don't fill the failure string because, at least for now, all
      // progress module tasks will be considered successful
      return this.newTaskMessage(
        new TaskMessageOperation(
          task.name.replace('progress/', ''),
          '',
          task.name.replace('progress/', '')
        ),
        (_metadata) => ''
      );
    }
    return this.messages[task.name] || this.defaultMessage;
  }

  getSuccessTitle(task: FinishedTask) {
    return this._getTaskTitle(task).success(task.metadata);
  }

  getErrorMessage(task: FinishedTask) {
    return (
      this._getTaskTitle(task).errors(task.metadata)[task.exception.code] || task.exception.detail
    );
  }

  getErrorTitle(task: Task) {
    return this._getTaskTitle(task).failure(task.metadata);
  }

  getRunningTitle(task: Task) {
    return this._getTaskTitle(task).running(task.metadata);
  }

  getRunningText(task: Task) {
    return this._getTaskTitle(task).operation.running;
  }
}
