import { Component, ContentChild, Directive, Host, Input, Output, TemplateRef } from '@angular/core';

export type SortDirection = 'asc' | 'desc' | '';
const changeDirectionMap: { [key: string]: SortDirection } = { asc: 'desc', desc: '', '': 'asc' };

@Component({
  selector: 'smart-table',
  templateUrl: './smart-table.component.html',
  styleUrls: ['./smart-table.component.css']
})
export class SmartTableComponent {

  @ContentChild("tr") tr: TemplateRef<any> | null = null;
  @Input()
  get data(): any[] | null {return this._data;}
  set data(value: any[] | null) {
    this._data = value;
    this.updateRows();
  }
  @Input() public pageSize: number | null = 15;
  public currentPage: number = 1;

  private filter: ((row: any) => boolean) | null = null
  public _data: any[] | null = null;
  public rows: any[] | null = null;
  public filteredRows: any[] | null = null;
  private sortColumn: string | null = null;
  private sortDirection: SortDirection = '';

  ngOnInit(): void {
    this.updateRows();
  }

  public sort(column: string, direction: SortDirection): void {
    this.sortColumn = column;
    this.sortDirection = direction;
    this.currentPage = 1;
    this.updateRows();
  }

  public filterRows(filter: ((row: any) => boolean)): void {
    this.filter = filter;
    this.updateRows();
  }

  public updateRows(): void {
    if (!this._data) {
      return;
    }
    this.rows = this._data.slice();
    if (this.sortColumn !== null && this.sortDirection !== '') {
      this.rows = this.rows.sort((a, b) => {
        if (a[this.sortColumn!] < b[this.sortColumn!]) {
          return this.sortDirection === 'asc' ? -1 : 1;
        }
        if (a[this.sortColumn!] > b[this.sortColumn!]) {
          return this.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    this.rows = this.rows.map((row, i) => ({ rowNumber: i + 1, ...row }));

    if (this.filter) {
      this.filteredRows = this.rows.filter(this.filter);
    } else {
      this.filteredRows = this.rows;
    }

    if (this.pageSize) {
      this.rows = this.filteredRows.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
    } else {
      this.rows = this.filteredRows;
    }
  }
}

@Directive({
  selector: 'th[sortable]',
  standalone: true,
  host: {
    '[class.asc]': 'direction === "asc"',
    '[class.desc]': 'direction === "desc"',
    '(click)': 'changeDirection()',
  },
})
export class NgbdSortableHeader {
  @Input() sortable: string | null = null;
  @Input() direction: SortDirection = '';
  private table: SmartTableComponent | null = null;

  constructor(@Host() private parent: SmartTableComponent) {
    this.table = parent;
  }

  ngOnInit(): void {
    if (this.sortable !== null && this.direction !== '') {
      this.parent.sort(this.sortable, this.direction);
    }
  }

  changeDirection() {
    this.direction = changeDirectionMap[this.direction];
    this.table?.sort(this.sortable!, this.direction);
  }
}
