import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  memberSince: string;
  isActive: boolean;
  roles: string[];
}

export interface CreateMemberRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  role: string;
  isActive: boolean;
}

export interface UpdateMemberRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly apiUrl = `${environment.apiUrl}/members`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Member[]>(this.apiUrl);
  }

  getById(id: string) {
    return this.http.get<Member>(`${this.apiUrl}/${id}`);
  }

  create(req: CreateMemberRequest) {
    return this.http.post<{ id: string; email: string }>(this.apiUrl, req);
  }

  update(id: string, req: UpdateMemberRequest) {
    return this.http.put<void>(`${this.apiUrl}/${id}`, req);
  }

  deactivate(id: string) {
    return this.http.put<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }
}
