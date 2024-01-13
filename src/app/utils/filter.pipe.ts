import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {

  transform(items: any[], filter: any, substrings: boolean = false): any[] {
    if (!items || !filter) {
      return items;
    }

    if (typeof filter === 'function') {
      return items.filter(filter);
    } else {
      return items.filter(item => this.compare(item, filter, substrings));
    }
  }

  compare(item: any, filter: any, substrings: boolean) {
    for (const prop in filter) {
      if (substrings && typeof filter[prop] === 'string') {
        if (typeof item[prop] !== 'string' || !item[prop].includes(filter[prop])) {
          return false;
        }
      } else if (filter[prop] !== item[prop]) {
        return false
      }
    }
    return true;
  }
}
