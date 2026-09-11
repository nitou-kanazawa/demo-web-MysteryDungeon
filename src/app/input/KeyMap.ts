import type { Direction } from '../../domain/core/Vec2';

/** 物理キー → 方向。矢印/WASD で直交、QEZC で斜め、テンキー・vi キーも対応 */
export function directionFromKey(key: string, code: string): Direction | undefined {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'KeyK':
    case 'Numpad8':
      return 'N';
    case 'ArrowDown':
    case 'KeyS':
    case 'KeyJ':
    case 'Numpad2':
      return 'S';
    case 'ArrowLeft':
    case 'KeyA':
    case 'KeyH':
    case 'Numpad4':
      return 'W';
    case 'ArrowRight':
    case 'KeyD':
    case 'KeyL':
    case 'Numpad6':
      return 'E';
    case 'KeyQ':
    case 'KeyY':
    case 'Numpad7':
      return 'NW';
    case 'KeyE':
    case 'KeyU':
    case 'Numpad9':
      return 'NE';
    case 'KeyZ':
    case 'KeyB':
    case 'Numpad1':
      return 'SW';
    case 'KeyC':
    case 'KeyN':
    case 'Numpad3':
      return 'SE';
    default:
      break;
  }
  void key;
  return undefined;
}
