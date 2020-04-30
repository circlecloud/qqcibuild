
class SelfManagedMap {
   constructor() {
     this._map = new Map
   }
   add(key) {
     const value = this._map.get(key);
     if ('number' == typeof value) {
       this._map.set(key, value + 1)
     } else {
       this._map.set(key, 1)
     }
   }
   delete(key) {
     const value = this._map.get(key);
     if ('number' == typeof value) {
       const c = value - 1;
       if (0 >= c) {
         this._map.delete(key)
       } else {
         this._map.set(key, c)
       }
     }
   }
   get size() {
     return this._map.size
   }
 }
 module.exports = {
   SelfManagedMap: SelfManagedMap
 }