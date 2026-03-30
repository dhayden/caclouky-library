using CacloukyLibrary.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CacloukyLibrary.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "MinisterOrAdmin")]
public class MembersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public MembersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET /api/members
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userManager.Users.OrderBy(u => u.LastName).ThenBy(u => u.FirstName).ToListAsync();
        var result = new List<object>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(new
            {
                u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.Address,
                u.MemberSince, u.IsActive,
                roles
            });
        }
        return Ok(result);
    }

    // GET /api/members/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new
        {
            user.Id, user.FirstName, user.LastName, user.Email, user.Phone, user.Address,
            user.MemberSince, user.IsActive, roles
        });
    }

    // POST /api/members
    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMemberRequest req)
    {
        var user = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            FirstName = req.FirstName,
            LastName = req.LastName,
            Phone = req.Phone,
            Address = req.Address,
            IsActive = req.IsActive ?? true
        };

        var result = await _userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded) return BadRequest(result.Errors);

        var role = req.Role ?? "GeneralAssembly";
        await _userManager.AddToRoleAsync(user, role);

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new { user.Id, user.Email });
    }

    // PUT /api/members/5
    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateMemberRequest req)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        user.FirstName = req.FirstName;
        user.LastName = req.LastName;
        user.Phone = req.Phone;
        user.Address = req.Address;
        user.IsActive = req.IsActive;

        if (!string.IsNullOrWhiteSpace(req.Email) && req.Email != user.Email)
        {
            user.UserName = req.Email;
            user.Email = req.Email;
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded) return BadRequest(updateResult.Errors);

        // Update role
        if (!string.IsNullOrWhiteSpace(req.Role))
        {
            var currentRoles = await _userManager.GetRolesAsync(user);
            await _userManager.RemoveFromRolesAsync(user, currentRoles);
            await _userManager.AddToRoleAsync(user, req.Role);
        }

        return NoContent();
    }

    // PUT /api/members/5/deactivate
    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        user.IsActive = false;
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    public record CreateMemberRequest(
        string FirstName, string LastName, string Email, string Password,
        string? Phone, string? Address, string? Role, bool? IsActive);

    public record UpdateMemberRequest(
        string FirstName, string LastName, string Email,
        string? Phone, string? Address, string Role, bool IsActive);
}
